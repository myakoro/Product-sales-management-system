import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

// SKU→親コード変換ロジック（売上CSV取込から流用）
function convertSkuToParentCode(sku: string): string {
    // Rule 1: RINO-XXXXX-X-XXX 形式 → RINO-XXXXX
    const rule1Match = sku.match(/^(RINO-[A-Z0-9]+)-/);
    if (rule1Match) {
        return rule1Match[1];
    }

    // Rule 2: RINOXXXXX 形式（ハイフン無し） → RINOXXXXX（最初の英字+数字部分）
    const rule2Match = sku.match(/^(RINO[A-Z]{2}\d{3})/);
    if (rule2Match) {
        return rule2Match[1];
    }

    // Rule 3: 上記にマッチしない場合はそのまま
    return sku;
}

// 文字列をShift-JISからUTF-8にデコード
function decodeShiftJIS(buffer: ArrayBuffer): string {
    try {
        const decoder = new TextDecoder('shift-jis');
        return decoder.decode(buffer);
    } catch {
        // Shift-JISデコードに失敗した場合はUTF-8として扱う
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(buffer);
    }
}

export async function POST(request: Request) {
    try {
        console.log('[商品CSV差分チェック] 処理開始');

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'CSVファイルが選択されていません' },
                { status: 400 }
            );
        }

        // ファイルを読み込み
        const arrayBuffer = await file.arrayBuffer();
        const csvText = decodeShiftJIS(arrayBuffer);

        console.log('[商品CSV差分チェック] CSV解析開始');

        // CSVを解析
        const parseResult = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim()
        });

        if (parseResult.errors.length > 0) {
            console.error('[商品CSV差分チェック] CSV解析エラー:', parseResult.errors);
            return NextResponse.json(
                { error: 'CSVの解析に失敗しました' },
                { status: 400 }
            );
        }

        const rows = parseResult.data as any[];
        console.log(`[商品CSV差分チェック] CSV解析完了: ${rows.length}行`);

        // CSVデータを親コード単位で集約
        const productMap = new Map<string, {
            sku: string;
            name: string | null;
            salesPrice: number | null;
            cost: number | null;
        }>();

        for (const row of rows) {
            const sku = row['商品コード（SKU）'] || row['商品コード'] || row['商品ｺｰﾄﾞ'] || '';
            const name = row['商品名'] || null;
            const salesPriceStr = row['販売価格（税別）'] || row['販売価格'] || row['定価'] || '0';
            const costStr = row['原価（税別）'] || row['原価'] || '0';

            if (!sku) continue;

            const parentCode = convertSkuToParentCode(sku);
            const salesPrice = parseFloat(salesPriceStr.replace(/,/g, '')) || 0;
            const cost = parseFloat(costStr.replace(/,/g, '')) || 0;

            // 同じ親コードの商品が複数ある場合は、最初のものを使用
            if (!productMap.has(parentCode)) {
                productMap.set(parentCode, {
                    sku,
                    name,
                    salesPrice,
                    cost
                });
            }
        }

        console.log(`[商品CSV差分チェック] 親コード集約完了: ${productMap.size}件`);

        // 既存の商品マスタを取得
        const existingProducts = await prisma.product.findMany({
            select: {
                productCode: true,
                productName: true,
                salesPriceExclTax: true,
                costExclTax: true
            }
        });

        const existingProductMap = new Map(
            existingProducts.map(p => [p.productCode, p])
        );

        console.log(`[商品CSV差分チェック] 既存商品マスタ: ${existingProducts.length}件`);

        // 新規候補と更新候補を抽出
        const newProducts: any[] = [];
        const updateProducts: any[] = [];

        for (const [parentCode, csvData] of productMap.entries()) {
            const existing = existingProductMap.get(parentCode);

            if (!existing) {
                // 新規候補
                newProducts.push({
                    productCode: parentCode,
                    productName: csvData.name,
                    salesPriceExclTax: csvData.salesPrice,
                    costExclTax: csvData.cost,
                    sampleSku: csvData.sku
                });
            } else {
                // 更新候補（差分がある場合のみ）
                const hasNameDiff = csvData.name && csvData.name !== existing.productName;
                const hasPriceDiff = csvData.salesPrice !== null && csvData.salesPrice !== existing.salesPriceExclTax;
                const hasCostDiff = csvData.cost !== null && csvData.cost !== existing.costExclTax;

                if (hasNameDiff || hasPriceDiff || hasCostDiff) {
                    updateProducts.push({
                        productCode: parentCode,
                        oldProductName: existing.productName,
                        newProductName: csvData.name || existing.productName,
                        oldSalesPriceExclTax: existing.salesPriceExclTax,
                        newSalesPriceExclTax: csvData.salesPrice ?? existing.salesPriceExclTax,
                        oldCostExclTax: existing.costExclTax,
                        newCostExclTax: csvData.cost ?? existing.costExclTax
                    });
                }
            }
        }

        console.log(`[商品CSV差分チェック] 新規候補: ${newProducts.length}件, 更新候補: ${updateProducts.length}件`);

        return NextResponse.json({
            newProducts,
            updateProducts
        });

    } catch (error: any) {
        console.error('[商品CSV差分チェック] エラー発生:', error);
        return NextResponse.json(
            { error: '差分チェックに失敗しました: ' + error.message },
            { status: 500 }
        );
    }
}
