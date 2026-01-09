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

// 文字コードを自動判別してデコード
function decodeBuffer(buffer: ArrayBuffer): string {
    const uint8arr = new Uint8Array(buffer);

    // UTF-8 BOM (EF BB BF) チェック
    if (uint8arr.length >= 3 && uint8arr[0] === 0xEF && uint8arr[1] === 0xBB && uint8arr[2] === 0xBF) {
        return new TextDecoder('utf-8').decode(uint8arr.slice(3));
    }

    // 文字化け発生率ベースでの簡易判別 (Shift-JIS vs UTF-8)
    try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        return utf8Decoder.decode(uint8arr);
    } catch {
        return new TextDecoder('shift-jis').decode(uint8arr);
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

        const arrayBuffer = await file.arrayBuffer();
        const csvText = decodeBuffer(arrayBuffer);

        console.log('[商品CSV差分チェック] CSV解析開始');

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

        // カテゴリーマスタを全件取得してMap化
        const categories = await prisma.productCategory.findMany();
        const categoryMapByName = new Map(categories.map(c => [c.name, c.id]));

        // CSVデータを親コード単位で集約
        const productMap = new Map<string, {
            sku: string;
            name: string | null;
            asin: string | null;
            salesPrice: number | null;
            cost: number | null;
            type: string | null;
            status: string | null;
            categoryName: string | null;
            categoryId: number | null;
            categoryExists: boolean;
        }>();

        for (const row of rows) {
            const sku = row['商品コード（SKU）'] || row['商品コード'] || row['商品ｺｰﾄﾞ'] || '';
            const name = row['商品名'] || null;
            const asin = row['ASIN'] || row['asin'] || null;
            const salesPriceStr = row['販売価格（税別）'] || row['販売価格'] || row['定価'] || '0';
            const costStr = row['原価（税別）'] || row['原価'] || '0';
            const typeStr = row['商品区分'] || '自社';
            const statusStr = row['管理ステータス'] || '管理中';
            const categoryName = row['カテゴリー'] || row['カテゴリ'] || null;

            if (!sku) continue;

            const parentCode = convertSkuToParentCode(sku);
            const salesPrice = parseFloat(String(salesPriceStr).replace(/,/g, '')) || 0;
            const cost = parseFloat(String(costStr).replace(/,/g, '')) || 0;

            // 内部値変換
            const productType = typeStr.includes('仕入') ? 'purchase' : 'own';
            const managementStatus = statusStr.includes('管理外') ? 'unmanaged' : 'managed';

            let categoryId = null;
            let categoryExists = true;
            if (categoryName && categoryName.trim() !== '') {
                categoryId = categoryMapByName.get(categoryName.trim()) || null;
                if (!categoryId) categoryExists = false;
            }

            if (!productMap.has(parentCode)) {
                productMap.set(parentCode, {
                    sku,
                    name,
                    asin,
                    salesPrice,
                    cost,
                    type: productType,
                    status: managementStatus,
                    categoryName,
                    categoryId,
                    categoryExists
                });
            }
        }

        // 既存の商品マスタを取得
        const existingProducts = await prisma.product.findMany({
            include: { category: true }
        });

        const existingProductMap = new Map(
            existingProducts.map(p => [p.productCode, p])
        );

        // ASINの重複チェック用マップ（現在のDBにある全ASIN）
        const asinToCodeMap = new Map(
            existingProducts.filter(p => p.asin).map(p => [p.asin as string, p.productCode])
        );

        const newProducts: any[] = [];
        const updateProducts: any[] = [];
        for (const [parentCode, csvData] of productMap.entries()) {
            const existing = existingProductMap.get(parentCode);

            if (!existing) {
                // ASIN重複警告（自分以外の商品が同じASINを持っている場合）
                const duplicateAsinCode = csvData.asin ? asinToCodeMap.get(csvData.asin) : null;
                const isAsinDuplicate = duplicateAsinCode !== null;

                newProducts.push({
                    productCode: parentCode,
                    productName: csvData.name,
                    asin: csvData.asin,
                    salesPriceExclTax: csvData.salesPrice,
                    costExclTax: csvData.cost,
                    productType: csvData.type,
                    managementStatus: csvData.status,
                    categoryName: csvData.categoryName || '未分類',
                    categoryId: csvData.categoryId,
                    categoryExists: csvData.categoryExists,
                    asinDuplicate: isAsinDuplicate,
                    duplicateAsinCode: duplicateAsinCode,
                    sampleSku: csvData.sku
                });
            } else {
                const hasNameDiff = csvData.name && csvData.name !== existing.productName;
                const hasAsinDiff = csvData.asin && csvData.asin !== existing.asin;
                const hasPriceDiff = csvData.salesPrice !== null && csvData.salesPrice !== existing.salesPriceExclTax;
                const hasCostDiff = csvData.cost !== null && csvData.cost !== existing.costExclTax;
                const hasTypeDiff = csvData.type && csvData.type !== existing.productType;
                const hasStatusDiff = csvData.status && csvData.status !== existing.managementStatus;

                // カテゴリー名の比較（null/空文字の正規化）
                const normCsvCat = (csvData.categoryName || '').trim();
                const normExCat = (existing.category?.name || '').trim();
                const hasCategoryDiff = normCsvCat !== normExCat;

                // ASIN重複警告
                const duplicateAsinCode = csvData.asin ? asinToCodeMap.get(csvData.asin) : null;
                const isAsinDuplicate = duplicateAsinCode !== null && duplicateAsinCode !== parentCode;

                if (hasNameDiff || hasAsinDiff || hasPriceDiff || hasCostDiff || hasTypeDiff || hasStatusDiff || hasCategoryDiff || isAsinDuplicate) {
                    updateProducts.push({
                        productCode: parentCode,
                        oldProductName: existing.productName,
                        newProductName: csvData.name || existing.productName,
                        oldAsin: existing.asin,
                        newAsin: csvData.asin || existing.asin,
                        oldSalesPriceExclTax: existing.salesPriceExclTax,
                        newSalesPriceExclTax: csvData.salesPrice ?? existing.salesPriceExclTax,
                        oldCostExclTax: existing.costExclTax,
                        newCostExclTax: csvData.cost ?? existing.costExclTax,
                        oldProductType: existing.productType,
                        newProductType: csvData.type || existing.productType,
                        oldManagementStatus: existing.managementStatus,
                        newManagementStatus: csvData.status || existing.managementStatus,
                        oldCategoryName: existing.category?.name || '未分類',
                        newCategoryName: csvData.categoryName || (existing.category?.name || '未分類'),
                        categoryId: csvData.categoryId,
                        categoryExists: csvData.categoryExists,
                        asinDuplicate: isAsinDuplicate,
                        duplicateAsinCode: duplicateAsinCode
                    });
                }
            }
        }

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
