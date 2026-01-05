
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

        // 3. 既存データ削除 (同一月・同一販路)
        const deletedRecords = await prisma.salesRecord.deleteMany({
            where: {
                periodYm: targetYm,
                salesChannelId: parseInt(channelId)
            }
        });
        console.log('[NE Sync] Deleted existing records:', deletedRecords.count);

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

        // 5. データ変換と保存
        const salesRecords = [];
        const [year, month] = targetYm.split('-').map(Number);
        const saleDate = new Date(year, month - 1, 1); // 月初日

        // 税率の取得（ループ外で1回だけ）
        const taxRateRecord = await prisma.taxRate.findFirst({
            where: {
                startYm: {
                    lte: targetYm
                }
            },
            orderBy: {
                startYm: 'desc'
            }
        });
        const taxRate = taxRateRecord ? (1 + taxRateRecord.rate) : 1.1; // デフォルト10%

        for (const row of orderData.data) {
            const sku = row.receive_order_row_goods_id;
            const parentCode = convertSkuToParentCode(sku);
            const quantity = parseInt(row.receive_order_row_quantity);
            const unitPrice = parseFloat(row.receive_order_row_unit_price);
            const totalAmount = unitPrice * quantity;

            // 商品マスタの存在確認
            const product = await prisma.product.findUnique({
                where: { productCode: parentCode }
            });

            if (!product) {
                console.warn(`[NE Sync] Product not found: ${parentCode} (SKU: ${sku})`);
                continue; // 商品マスタに存在しない場合はスキップ
            }

            const salesAmountExclTax = totalAmount / taxRate;
            const costAmountExclTax = product.costExclTax * quantity;
            const grossProfit = salesAmountExclTax - costAmountExclTax;

            salesRecords.push({
                productCode: parentCode,
                periodYm: targetYm,
                salesDate: saleDate,
                quantity,
                salesAmountExclTax,
                costAmountExclTax,
                grossProfit,
                salesChannelId: parseInt(channelId),
                externalOrderId: String(row.receive_order_row_no),
                importHistoryId: importHistory.id,
                createdByUserId: parseInt((session.user as any).id)
            });
        }

        // 6. 一括保存
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
