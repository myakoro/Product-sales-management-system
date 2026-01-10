
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nextEngineClient } from '@/lib/nextengine';
import { convertSkuToParentCode } from '@/lib/csv-parser';

/**
 * POST /api/nextengine/sync
 * ネクストエンジンから受注データを取得して同期する
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { targetYm, channelId } = await request.json();

        if (!targetYm || !channelId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        console.log('[NE Sync] Starting sync:', { targetYm, channelId });

        // 1. 販路に紐づく店舗IDを取得
        const mappings = await prisma.nEShopMapping.findMany({
            where: { channelId: parseInt(channelId) }
        });

        if (mappings.length === 0) {
            return NextResponse.json({
                error: '選択された販路に紐づく店舗が設定されていません。店舗マッピングを設定してください。'
            }, { status: 400 });
        }

        const shopIds = mappings.map(m => m.neShopId);
        console.log('[NE Sync] Shop IDs:', shopIds);

        // 店舗名を取得
        const shopsData = await nextEngineClient.getShops();
        const shopNames = shopIds
            .map(id => {
                const shop = shopsData.data?.find((s: any) => s.shop_id === String(id));
                return shop ? `${shop.shop_name}(ID:${id})` : `店舗ID:${id}`;
            })
            .join(', ');

        // 2. NE APIから受注データを取得
        const orderData = await nextEngineClient.searchOrderRows(targetYm, shopIds);
        console.log('[NE Sync] Order data received:', { count: orderData.count, dataLength: orderData.data?.length });

        if (!orderData.data || orderData.data.length === 0) {
            return NextResponse.json({
                message: '指定された期間・店舗の受注データが見つかりませんでした。',
                recordCount: 0
            });
        }

        // 3. 既存データ集計レコードを削除 (重複回避)
        // NE自動同期によって作成されたこの「月・販路」のレコードを一旦削除する
        const deletedPeriodRecords = await prisma.salesRecord.deleteMany({
            where: {
                periodYm: targetYm,
                salesChannelId: parseInt(channelId),
                externalOrderId: {
                    startsWith: `NE-${channelId}-${targetYm}-`
                }
            }
        });
        console.log('[NE Sync] Cleaned up existing sync records:', deletedPeriodRecords.count);

        // 4. 取込履歴を作成
        const importHistory = await prisma.importHistory.create({
            data: {
                importType: 'sales',
                targetYm,
                importMode: 'overwrite',
                dataSource: 'API',
                comment: `ネクストエンジン自動同期 (${shopNames})`,
                salesChannelId: parseInt(channelId),
                recordCount: 0, // 後で更新
                importedByUserId: parseInt((session.user as any).id)
            }
        });

        // 5. データ集計と変換
        // 商品コード単位で数量と金額を集計するためのMap
        const aggregatedData = new Map<string, {
            quantity: number;
            totalAmount税込: number;
            productCode: string;
            productName: string | null;
        }>();

        const [year, month] = targetYm.split('-').map(Number);
        const saleDate = new Date(year, month - 1, 1); // 月初日

        // exclusionKeywordsを取得
        const exclusionKeywords = await prisma.exclusionKeyword.findMany();

        // デバッグ: APIから取得した生データをログに出力
        const csvHeader = 'receive_order_id,receive_order_row_no,SKU,product_name,quantity,unit_price,sub_total,cancel_flag';
        const csvRows = orderData.data.map((row: any) => {
            return `${row.receive_order_id},${row.receive_order_row_no},"${row.receive_order_row_goods_id}","${(row.receive_order_row_goods_name || '').replace(/"/g, '""')}",${row.receive_order_row_quantity},${row.receive_order_row_unit_price},${row.receive_order_row_sub_total_price},${row.receive_order_row_cancel_flag || '0'}`;
        }).join('\n');
        console.log('[NE Sync] ===== CSV DATA START =====');
        console.log(csvHeader);
        console.log(csvRows);
        console.log('[NE Sync] ===== CSV DATA END =====');

        // デバッグ用: Fr013関連のログ
        let fr013RowCount = 0;
        let fr013TotalQty = 0;
        const fr013Details: any[] = [];

        // 受注ID単位で重複除外（セット商品対応）
        const processedOrders = new Map<string, Set<string>>();

        for (const row of orderData.data) {
            const sku = row.receive_order_row_goods_id;
            const productName = row.receive_order_row_goods_name || null;

            // 除外キーワードのチェック (一致したらスキップ)
            const isExcluded = exclusionKeywords.some(k =>
                k.matchType === 'startsWith' ? sku.startsWith(k.keyword) : sku.includes(k.keyword)
            );
            if (isExcluded) continue;

            // キャンセルフラグのチェック (1=キャンセルの場合はスキップ)
            const cancelFlag = row.receive_order_row_cancel_flag;
            if (cancelFlag === '1' || cancelFlag === 1) {
                const parentCode = convertSkuToParentCode(sku).trim().toUpperCase();
                if (parentCode.toUpperCase().includes('FR013')) {
                    console.log(`[NE Sync] FR013 CANCELLED: orderId=${row.receive_order_id}, SKU=${sku}`);
                }
                continue;
            }

            const parentCode = convertSkuToParentCode(sku).trim().toUpperCase();
            const quantity = parseInt(row.receive_order_row_quantity);
            // receive_order_row_sub_total_price（行小計：割引などを反映した後の金額）を使用
            const subTotal = parseFloat(row.receive_order_row_sub_total_price || '0');

            // 受注ID単位で重複チェック（セット商品対応）
            const orderId = row.receive_order_id;
            if (!processedOrders.has(parentCode)) {
                processedOrders.set(parentCode, new Set());
            }
            const orderSet = processedOrders.get(parentCode)!;

            // この受注IDが既に処理済みの場合はスキップ（金額のみ加算）
            const isNewOrder = !orderSet.has(orderId);
            if (isNewOrder) {
                orderSet.add(orderId);
            }

            // デバッグ: Fr013関連のログ
            if (parentCode.toUpperCase().includes('FR013')) {
                fr013RowCount++;
                fr013TotalQty += quantity;
                fr013Details.push({
                    orderId: row.receive_order_id,
                    rowNo: row.receive_order_row_no,
                    sku,
                    parentCode,
                    quantity,
                    subTotal,
                    productName
                });
            }


            if (aggregatedData.has(parentCode)) {
                const existing = aggregatedData.get(parentCode)!;
                // 数量は新しい受注の場合のみ加算（セット商品対応）
                if (isNewOrder) {
                    existing.quantity += quantity;
                }
                // 金額は常に加算
                existing.totalAmount税込 += subTotal;
                // 商品名は最初に見つかったものを保持
            } else {
                aggregatedData.set(parentCode, {
                    quantity: isNewOrder ? quantity : 0,
                    totalAmount税込: subTotal,
                    productCode: parentCode,
                    productName
                });
            }
        }

        console.log(`[NE Sync] Fr013 summary: ${fr013RowCount} rows, total quantity: ${fr013TotalQty}`);
        if (fr013Details.length > 0) {
            console.log('[NE Sync] Fr013 details (first 20):');
            fr013Details.slice(0, 20).forEach((d, i) => {
                console.log(`  ${i + 1}. 受注ID:${d.orderId}, 明細番号:${d.rowNo}, SKU:${d.sku}, 数量:${d.quantity}, 金額:${d.subTotal}`);
            });
            if (fr013Details.length > 20) {
                console.log(`  ... 他 ${fr013Details.length - 20}件`);
            }
        }

        // 集計後のFR013データを確認
        const fr013Aggregated = aggregatedData.get('RINO-FR013');
        if (fr013Aggregated) {
            console.log(`[NE Sync] Fr013 AGGREGATED: quantity=${fr013Aggregated.quantity}, amount=${fr013Aggregated.totalAmount税込}`);
        }

        // 税率の取得
        const taxRateRecord = await prisma.taxRate.findFirst({
            where: { startYm: { lte: targetYm } },
            orderBy: { startYm: 'desc' }
        });
        const taxRate = taxRateRecord ? (1 + taxRateRecord.rate) : 1.1;

        // 新商品候補を収集するMap
        const newProductCandidates = new Map<string, { sku: string; name: string | null }>();

        const salesRecords = [];
        for (const [parentCode, data] of aggregatedData.entries()) {
            // 商品マスタの存在確認
            const product = await prisma.product.findUnique({
                where: { productCode: parentCode }
            });

            if (!product) {
                console.warn(`[NE Sync] Product not found: ${parentCode}`);
                // 新商品候補として記録
                if (!newProductCandidates.has(parentCode)) {
                    newProductCandidates.set(parentCode, {
                        sku: parentCode,
                        name: data.productName
                    });
                }
                continue;
            }

            // 管理ステータスチェック
            if (product.managementStatus === '管理外' || product.managementStatus === 'unmanaged') {
                continue;
            }

            const salesAmountExclTax = Math.round(data.totalAmount税込 / taxRate);
            const costAmountExclTax = product.costExclTax * data.quantity;
            const grossProfit = salesAmountExclTax - costAmountExclTax;

            salesRecords.push({
                productCode: parentCode,
                periodYm: targetYm,
                salesDate: saleDate,
                quantity: data.quantity,
                salesAmountExclTax,
                costAmountExclTax,
                grossProfit,
                salesChannelId: parseInt(channelId),
                // 決定論的な外部ID: NE-[販路ID]-[年月]-[商品コード]
                externalOrderId: `NE-${channelId}-${targetYm}-${parentCode}`,
                importHistoryId: importHistory.id,
                createdByUserId: parseInt((session.user as any).id)
            });
        }

        // 新商品候補を登録（手動CSV取込と同じロジック）
        if (newProductCandidates.size > 0) {
            console.log('[NE Sync] 新商品候補チェック中:', newProductCandidates.size, '件');
            const candidateCodes = Array.from(newProductCandidates.keys());
            const existingCandidates = await prisma.newProductCandidate.findMany({
                where: { productCode: { in: candidateCodes } },
                select: { productCode: true }
            });
            const existingSet = new Set(existingCandidates.map(c => c.productCode));

            for (const [parentCode, data] of newProductCandidates.entries()) {
                if (!existingSet.has(parentCode)) {
                    console.log('[NE Sync] 新商品候補登録:', parentCode);
                    await prisma.newProductCandidate.create({
                        data: {
                            productCode: parentCode,
                            sampleSku: data.sku,
                            productName: data.name,
                            status: 'pending'
                        }
                    });
                }
            }
        }

        if (salesRecords.length > 0) {
            await prisma.salesRecord.createMany({
                data: salesRecords
            });
        }

        // 7. 取込履歴のレコード数を更新
        await prisma.importHistory.update({
            where: { id: importHistory.id },
            data: { recordCount: salesRecords.length }
        });

        console.log('[NE Sync] Sync completed:', { recordCount: salesRecords.length });

        return NextResponse.json({
            success: true,
            recordCount: salesRecords.length,
            message: `${salesRecords.length}件のデータを同期しました`
        });

    } catch (error: any) {
        console.error('[NE Sync] Error:', error);
        return NextResponse.json({
            error: error.message || 'Failed to sync data'
        }, { status: 500 });
    }
}
