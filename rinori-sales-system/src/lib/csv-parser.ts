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
    // Start with RINO-, followed by Alphanumeric.
    // The spec example shows RINO-FR010-X-BLK. The part we want is RINO-FR010.
    // Regex: ^(RINO-[A-Z0-9]+)
    // Wait, if it is RINO-FR010-X-BLK, match[1] will be RINO-FR010 IF the next char is not A-Z0-9?
    // No, + is greedy. It will match RINO-FR010-X-BLK entirely if it's all alphanumeric + hyphen?
    // Spec says: "Rule 1: ^(RINO-[A-Z0-9]+)"
    // And example: RINO-FR010-X-BLK -> RINO-FR010
    // This implies conversion must stop before the variant part.
    // Usually variant is separated by hyphen.
    // If Rule is ^(RINO-[^-]+), that isolates RINO-FR010.
    // But spec explicitly says `^(RINO-[A-Z0-9]+)`.
    // Valid chars in ParentCode?
    // Let's assume the spec regex meant "RINO-" + "MainPart".
    // 01_DB.md says:
    // Pattern: `^(RINO-[A-Z0-9]+)`
    // Example: `RINO-FR010-X-BLK` -> `RINO-FR010`
    // If I use `^(RINO-[A-Z0-9]+)` on `RINO-FR010-X-BLK`:
    // It matches `RINO-FR010` IF `-` is not in `[A-Z0-9]`.
    // Yes, `-` is not in `[A-Z0-9]`.
    // So it stops at the first hyphen after RINO-.
    // Wait, `RINO-` includes a hyphen.
    // Sequence: R, I, N, O, -
    // Then [A-Z0-9]+ (one or more alphanum).
    // F, R, 0, 1, 0 (match)
    // - (stop, because - is not A-Z0-9)
    // So `RINO-FR010` is matched. Correct.

    const match1 = cleanSku.match(/^(RINO-[A-Z0-9]+)/);
    if (match1) return match1[1];

    // Rule 2: RINO 形式 (No hyphen)
    // Pattern: `^(RINO[A-Z]+[0-9]{3,4})`
    // Example: `RINODO002BLK` -> `RINODO002`
    // RINO + DO (Alpha) + 002 (Digits 3-4)
    // BLK (Next chars)
    // So `RINO` then `[A-Z]+` then `[0-9]{3,4}`.
    const match2 = cleanSku.match(/^(RINO[A-Z]+[0-9]{3,4})/);
    if (match2) return match2[1];

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

