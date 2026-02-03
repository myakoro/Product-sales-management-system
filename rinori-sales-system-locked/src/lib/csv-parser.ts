import Papa from 'papaparse';

export interface SalesCsvRow {
    productCode: string;
    productName: string;
    quantity: number;
    salesAmount税込: number;
}

export function convertSkuToParentCode(sku: string): string {
    // Trim whitespace
    const cleanSku = sku.trim();

    // Rule 1: RINO- 形式 (e.g., RINO-FR010-X-BLK -> RINO-FR010)
    // 大文字小文字を区別しない（iフラグ）
    // ネクストエンジンから RINO-Fr013-M-BLK のような混在形式が来る可能性があるため
    const match1 = cleanSku.match(/^(RINO-[A-Z0-9]+)/i);
    if (match1) return match1[1].toUpperCase(); // 常に大文字で返す

    // Rule 2: RINO 形式 (No hyphen)
    // 大文字小文字を区別しない（iフラグ）
    const match2 = cleanSku.match(/^(RINO[A-Z]+[0-9]{3,4})/i);
    if (match2) return match2[1].toUpperCase(); // 常に大文字で返す

    // Rule 3: As is
    return cleanSku;
}

export async function parseSalesCsv(file: File, isAmazon: boolean = false): Promise<SalesCsvRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const buffer = event.target?.result as ArrayBuffer;

                // Try UTF-8 first, then Shift-JIS
                const encodings = ['utf-8', 'shift-jis'];
                let rows: SalesCsvRow[] = [];
                let success = false;

                for (const encoding of encodings) {
                    const decoder = new TextDecoder(encoding);
                    const csvText = decoder.decode(buffer);

                    const results = Papa.parse(csvText, {
                        header: true,
                        skipEmptyLines: true,
                    });

                    const tempRows: SalesCsvRow[] = [];
                    results.data.forEach((row: any) => {
                        const findVal = (keys: string[]) => {
                            for (const k of keys) {
                                if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
                            }
                            return undefined;
                        };

                        if (isAmazon) {
                            // Amazon形式のパース
                            const asin = findVal(['（親）ASIN', '(親)ASIN', 'ASIN']);
                            const title = findVal(['タイトル']);
                            const totalQtyRaw = findVal(['注文された商品点数']);
                            const b2bQtyRaw = findVal(['注文点数 - B2B']);
                            const totalAmtRaw = findVal(['注文商品の売上額']);
                            const b2bAmtRaw = findVal(['注文商品の売上額 - B2B']);

                            if (asin) {
                                const totalQty = parseNumericalValue(totalQtyRaw || '0');
                                const b2bQty = parseNumericalValue(b2bQtyRaw || '0');
                                const qty = Math.max(0, totalQty - b2bQty);

                                const totalAmt = parseNumericalValue(totalAmtRaw || '0');
                                const b2bAmt = parseNumericalValue(b2bAmtRaw || '0');
                                const amt = Math.max(0, totalAmt - b2bAmt);

                                tempRows.push({
                                    productCode: String(asin), // ASINをコードとして表示
                                    productName: title || '',
                                    quantity: qty,
                                    salesAmount税込: amt,
                                });
                            }
                        } else {
                            // NE形式のパース
                            const sku = findVal(['商品コード', '商品ｺｰﾄﾞ', '商品コード（SKU）', 'SKU']);
                            const name = findVal(['商品名', '商品名称']);
                            const qty = findVal(['受注数', '数量']);
                            const amount = findVal(['売上金額（税込）', '金額', '小計']);

                            if (sku) {
                                tempRows.push({
                                    productCode: String(sku),
                                    productName: name || '',
                                    quantity: parseNumericalValue(qty || '0'),
                                    salesAmount税込: parseNumericalValue(amount || '0'),
                                });
                            }
                        }
                    });

                    if (tempRows.length > 0) {
                        rows = tempRows;
                        success = true;
                        break;
                    }
                }

                if (!success) {
                    console.warn("Could not find data with UTF-8 or Shift-JIS parsing.");
                }
                resolve(rows);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 数値文字列からカンマや通貨記号を除去してパース
 */
function parseNumericalValue(value: any): number {
    if (value === undefined || value === null || value === '') return 0;
    const str = String(value);
    // ￥, ¥, カンマを除去
    const cleaned = str.replace(/[￥¥,]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
}

