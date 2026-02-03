
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// SKU → 親コード変換関数（仕様書 01_システム概要とDB設計.md 4章準拠）
function convertSkuToParentCode(sku: string): string {
    const trimmedSku = sku.trim();

    // Rule 1: RINO- 形式
    // パターン: RINO- で始まり、その後に英数字が続く
    // 例: RINO-FR010-X-BLK → RINO-FR010
    const rule1Match = trimmedSku.match(/^(RINO-[A-Z0-9]+)/);
    if (rule1Match) {
        console.log(`[SKU変換] Rule1適用: ${sku} → ${rule1Match[1]}`);
        return rule1Match[1];
    }

    // Rule 2: RINO 形式（ハイフン無し）
    // パターン: RINO + 英字 + 数字3〜4桁
    // 例: RINODO002BLK → RINODO002
    const rule2Match = trimmedSku.match(/^(RINO[A-Z]+[0-9]{3,4})/);
    if (rule2Match) {
        console.log(`[SKU変換] Rule2適用: ${sku} → ${rule2Match[1]}`);
        return rule2Match[1];
    }

    // Rule 3: その他
    // SKUをそのまま親コードとして使用
    console.log(`[SKU変換] Rule3適用: ${sku} → ${trimmedSku}`);
    return trimmedSku;
}

// CSVのカラム定義（NE形式 - 柔軟に対応するための候補リスト）
const COL_MAPPING = {
    productCode: ['商品コード', '商品ｺｰﾄﾞ', 'product_code', 'code', '品番', '商品コード（SKU）'],
    productName: ['商品名', 'product_name', 'name', '品名'],
    date: ['受注日', 'order_date', 'date', '売上日'],
    quantity: ['受注数', 'quantity', 'qty', '数量'],
    amount: ['小計', '商品計', 'amount', 'price', '売上金額', '売上金額（税込）', '金額']
};

// Amazon CSVのカラム定義【V1.51追加】
const AMAZON_COL_MAPPING = {
    asin: ['（親）ASIN', '(親)ASIN'],
    title: ['タイトル'],
    quantity: ['注文された商品点数'],
    quantityB2B: ['注文点数 - B2B'],
    amount: ['注文商品の売上額'],
    amountB2B: ['注文商品の売上額 - B2B']
};

// Amazon固有の数値フォーマットをパース【V1.51追加】
function parseAmazonNumber(value: string): number {
    if (!value || value === '￥0' || value === '0') return 0;
    // 円記号を除去
    let cleaned = value.replace(/[￥¥]/g, '');
    // カンマを除去
    cleaned = cleaned.replace(/,/g, '');
    // 数値に変換
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
}

export async function POST(request: Request) {
    console.log('[売上CSV取込] 処理開始');
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const targetYm = formData.get('targetYm') as string;
        const importMode = formData.get('importMode') as string;
        const comment = formData.get('comment') as string || '';
        const salesChannelIdStr = formData.get('salesChannelId') as string;
        const dataSource = (formData.get('dataSource') as string) || 'NE'; // V1.51追加: 'NE' or 'Amazon'
        const skipUnregisteredAsins = formData.get('skipUnregisteredAsins') === 'true'; // V1.51追加

        console.log('[売上CSV取込] パラメータ:', { targetYm, importMode, salesChannelId: salesChannelIdStr, dataSource, fileName: file?.name });

        if (!file || !targetYm || !importMode || !salesChannelIdStr) {
            return NextResponse.json({ error: '必須パラメータが不足しています（販路の選択が必要です）' }, { status: 400 });
        }

        const salesChannelId = parseInt(salesChannelIdStr, 10);
        if (isNaN(salesChannelId)) {
            return NextResponse.json({ error: '販路IDが不正です' }, { status: 400 });
        }

        const salesChannel = await prisma.salesChannel.findUnique({
            where: { id: salesChannelId }
        });
        if (!salesChannel) {
            return NextResponse.json({ error: '指定された販路が存在しません' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const decodedText = new TextDecoder('utf-8').decode(buffer);
        let parsedData: any[] = [];

        const parseResult = Papa.parse(decodedText, { header: true, skipEmptyLines: true });

        const headers = parseResult.meta.fields || [];

        // 【V1.51追加】Amazon形式のバリデーション
        if (dataSource === 'Amazon') {
            const checkHeaders = (h: string[]) => {
                const hasAsin = AMAZON_COL_MAPPING.asin.some(c => h.includes(c));
                const hasQty = AMAZON_COL_MAPPING.quantity.some(c => h.includes(c));
                const hasAmt = AMAZON_COL_MAPPING.amount.some(c => h.includes(c));
                return hasAsin && hasQty && hasAmt;
            };

            if (!checkHeaders(headers)) {
                // Shift-JISでの再試行
                const sjisText = new TextDecoder('shift-jis').decode(buffer);
                const sjisResult = Papa.parse(sjisText, { header: true, skipEmptyLines: true });
                const sjisHeaders = sjisResult.meta.fields || [];
                if (checkHeaders(sjisHeaders)) {
                    parsedData = sjisResult.data;
                } else {
                    return NextResponse.json({ error: 'Amazon CSVの形式が正しくありません（必須列が見つかりません）' }, { status: 400 });
                }
            } else {
                parsedData = parseResult.data;
            }
        } else {
            // 従来のNE形式バリデーション
            const hasCode = COL_MAPPING.productCode.some(c => headers.includes(c));

            if (!hasCode) {
                const sjisText = new TextDecoder('shift-jis').decode(buffer);
                const retryResult = Papa.parse(sjisText, { header: true, skipEmptyLines: true });
                if (retryResult.meta.fields && COL_MAPPING.productCode.some(c => retryResult.meta.fields!.includes(c))) {
                    parsedData = retryResult.data;
                } else {
                    parsedData = parseResult.data;
                }
            } else {
                parsedData = parseResult.data;
            }
        }

        console.log(`[売上CSV取込] CSV解析完了: ${parsedData.length} 行 (ソース: ${dataSource})`);

        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: '認証されていません' }, { status: 401 });
        }

        const user = session.user as any;
        const userId = parseInt(user.id, 10);

        const findCol = (row: any, candidates: string[]) => {
            for (const c of candidates) {
                if (row[c] !== undefined && row[c] !== null && row[c] !== '') return row[c];
            }
            return null;
        };

        // 税率取得（共通）
        const taxRateRecord = await prisma.taxRate.findFirst({
            where: { startYm: { lte: targetYm } },
            orderBy: { startYm: 'desc' },
        });

        if (!taxRateRecord) {
            return NextResponse.json({
                error: `対象年月 ${targetYm} に適用する税率が登録されていません。`,
            }, { status: 400 });
        }

        const taxRate = taxRateRecord.rate;

        const recordsToCreate: any[] = [];
        const newProductCandidates: Map<string, { sku: string, name: string | null }> = new Map();
        const unregisteredAsins: { asin: string, title: string }[] = []; // V1.51追加

        console.log('[売上CSV取込] 商品マスタ取得中');
        const allProducts = await prisma.product.findMany();
        // 親コードMapとASIN Mapの両方を用意
        const productMap = new Map((allProducts as any[]).map(p => [p.productCode, p]));
        const asinMap = new Map((allProducts as any[]).filter(p => p.asin).map(p => [p.asin!, p]));
        console.log('[売上CSV取込] 商品マスタ件数:', allProducts.length);

        for (const row of parsedData) {
            let parentCode: string = '';
            let productName: string | null = null;
            let qty: number = 0;
            let amtInclTax: number = 0;
            let originalKey: string = ''; // SKU or ASIN

            if (dataSource === 'Amazon') {
                const asin = findCol(row, AMAZON_COL_MAPPING.asin);
                if (!asin) continue;
                originalKey = asin;
                productName = findCol(row, AMAZON_COL_MAPPING.title);

                // B2B売上を除外（合計 - B2B）
                const totalQty = parseAmazonNumber(findCol(row, AMAZON_COL_MAPPING.quantity) || '0');
                const b2bQty = parseAmazonNumber(findCol(row, AMAZON_COL_MAPPING.quantityB2B) || '0');
                qty = Math.max(0, totalQty - b2bQty);

                const totalAmt = parseAmazonNumber(findCol(row, AMAZON_COL_MAPPING.amount) || '0');
                const b2bAmt = parseAmazonNumber(findCol(row, AMAZON_COL_MAPPING.amountB2B) || '0');
                amtInclTax = Math.max(0, totalAmt - b2bAmt);

                const product = asinMap.get(asin);
                if (!product) {
                    if (!unregisteredAsins.find(u => u.asin === asin)) {
                        unregisteredAsins.push({ asin, title: productName || '' });
                    }
                    continue;
                }
                parentCode = product.productCode;
                // 管理ステータスチェック（共通）
                if (product.managementStatus === '管理外' || product.managementStatus === 'unmanaged') {
                    console.log('[売上CSV取込] 管理外商品をスキップ:', parentCode);
                    continue;
                }
            } else {
                // NE形式
                const originalSku = findCol(row, COL_MAPPING.productCode);
                if (!originalSku) continue;
                originalKey = originalSku;
                parentCode = convertSkuToParentCode(originalSku);
                productName = findCol(row, COL_MAPPING.productName);
                qty = parseInt(findCol(row, COL_MAPPING.quantity) || '0', 10);
                amtInclTax = parseFloat(findCol(row, COL_MAPPING.amount) || '0');

                const product = productMap.get(parentCode);
                if (!product) {
                    if (!newProductCandidates.has(parentCode)) {
                        newProductCandidates.set(parentCode, {
                            sku: originalSku,
                            name: productName
                        });
                    }
                    continue;
                }
                // 管理ステータスチェック（共通）
                if (product.managementStatus === '管理外' || product.managementStatus === 'unmanaged') {
                    console.log('[売上CSV取込] 管理外商品をスキップ:', parentCode);
                    continue;
                }
            }

            if (qty === 0 && amtInclTax === 0) continue;

            // 税込金額 → 税抜金額への変換（共通・詳細設計書2-3準拠：整数丸め）
            const salesExclTax = Math.round(amtInclTax / (1 + taxRate));

            // 商品情報を取得（再度安全に取得）
            const product = productMap.get(parentCode);
            if (!product) continue;

            const cost = product.costExclTax * qty;
            const gross = salesExclTax - cost;

            recordsToCreate.push({
                productCode: parentCode,
                periodYm: targetYm,
                salesDate: new Date(), // Amazon形式は日付列がないため現在日時（NE形式も同様の運用）
                quantity: qty,
                salesAmountExclTax: salesExclTax,
                costAmountExclTax: cost,
                grossProfit: gross,
                salesChannelId: salesChannelId,
                createdByUserId: userId
            });
        }

        // 【V1.51追加】未登録ASINがある場合の警告レスポンス
        if (dataSource === 'Amazon' && unregisteredAsins.length > 0 && !skipUnregisteredAsins) {
            console.log('[売上CSV取込] 未登録ASIN検出:', unregisteredAsins.length, '件');
            return NextResponse.json({
                success: false,
                error: 'unregistered_asins',
                unregisteredAsins
            });
        }

        console.log('[売上CSV取込] データ準備完了:', {
            validRecords: recordsToCreate.length,
            newCandidates: newProductCandidates.size
        });

        console.log('[売上CSV取込] トランザクション開始');
        await prisma.$transaction(async (tx) => {
            // 新商品候補を登録（仕様書準拠: product_code, sample_sku, product_name）
            if (newProductCandidates.size > 0) {
                console.log('[売上CSV取込] 新商品候補チェック中');
                const candidateCodes = Array.from(newProductCandidates.keys());
                const existingCandidates = await tx.newProductCandidate.findMany({
                    where: { productCode: { in: candidateCodes } },
                    select: { productCode: true }
                });
                const existingSet = new Set(existingCandidates.map(c => c.productCode));

                for (const [parentCode, data] of newProductCandidates.entries()) {
                    if (!existingSet.has(parentCode)) {
                        console.log('[売上CSV取込] 新商品候補登録:', {
                            parentCode,
                            sku: data.sku,
                            name: data.name
                        });
                        await tx.newProductCandidate.create({
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

            if (importMode === 'overwrite') {
                console.log('[売上CSV取込] 上書きモード: 同月・同販路の既存データを削除中:', { targetYm, salesChannelId });
                const oldHistories = await tx.importHistory.findMany({
                    where: {
                        importType: 'sales',
                        targetYm: targetYm,
                        salesChannelId: salesChannelId
                    },
                    select: { id: true }
                });
                const oldHistoryIds = oldHistories.map(h => h.id);
                if (oldHistoryIds.length > 0) {
                    await tx.salesRecord.deleteMany({
                        where: { importHistoryId: { in: oldHistoryIds } }
                    });
                    await tx.importHistory.deleteMany({
                        where: { id: { in: oldHistoryIds } }
                    });
                    console.log('[売上CSV取込] 削除完了: 履歴', oldHistoryIds.length, '件');
                }
            }

            console.log('[売上CSV取込] 履歴作成中');
            const history = await (tx.importHistory as any).create({
                data: {
                    importType: 'sales',
                    targetYm: targetYm,
                    importMode: importMode,
                    dataSource: dataSource, // V1.51追加
                    comment: comment,
                    salesChannelId: salesChannelId,
                    recordCount: recordsToCreate.length,
                    importedByUserId: parseInt(user.id)
                }
            });

            console.log('[売上CSV取込] 売上レコード登録中:', recordsToCreate.length);
            for (const record of recordsToCreate) {
                await tx.salesRecord.create({
                    data: {
                        ...record,
                        importHistoryId: history.id
                    }
                });
            }
        });

        console.log('[売上CSV取込] トランザクション完了');

        const skippedCodes = Array.from(newProductCandidates.keys());

        if (recordsToCreate.length === 0 && skippedCodes.length > 0) {
            return NextResponse.json({
                success: true,
                importedCount: 0,
                skippedCount: skippedCodes.length,
                skippedCodes,
                message: `マスタ未登録の商品が${skippedCodes.length}件検出されました。「新商品候補一覧」から登録を行ってください。`
            });
        }

        return NextResponse.json({
            success: true,
            importedCount: recordsToCreate.length,
            skippedCount: skippedCodes.length,
            skippedCodes
        });

    } catch (error: any) {
        console.error('[売上CSV取込] エラー発生:', error);
        console.error('[売上CSV取込] エラースタック:', error.stack);
        return NextResponse.json({
            error: 'ファイル取込中にエラーが発生しました: ' + (error.message || error)
        }, { status: 500 });
    }
}
