import Papa from 'papaparse';
import Encoding from 'encoding-japanese';


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

export async function parseSalesCsv(file: File): Promise<SalesCsvRow[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const buffer = event.target?.result as ArrayBuffer;
                // Shift_JIS decoding using encoding-japanese
                const uint8Array = new Uint8Array(buffer);
                const detectedEncoding = Encoding.detect(uint8Array);
                console.log('Detected encoding:', detectedEncoding);

                const unicodeArray = Encoding.convert(uint8Array, {
                    to: 'UNICODE',
                    from: detectedEncoding || 'SJIS'
                });
                const csvText = Encoding.codeToString(unicodeArray);


                Papa.parse(csvText, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        console.log('Papa parse complete. Total rows:', results.data.length);
                        console.log('Headers:', results.meta.fields);
                        console.log('First row sample:', results.data[0]);

                        const rows: SalesCsvRow[] = [];
                        if (results.errors.length > 0) {
                            console.warn("CSV parse errors:", results.errors);
                        }

                        // Mapping columns based on index or header name?
                        // Spec says:
                        // 1: 商品コード（SKU）
                        // 2: 商品名
                        // 3: 受注数
                        // 4: 売上金額（税込）
                        // Ne headers are typically Japanese.
                        // We can assume standard NE headers or just map by order if headers missing?
                        // "CSVはヘッダー行を含む" (Spec 1.1)
                        // Verify header names from user provided sample later.
                        // For now trust header names in results.meta.fields or map manually?
                        // Safe approach: map by standard expected headers.
                        // Common NE headers: "商品コード", "商品名", "受注数", "受注単価"??
                        // Spec table: "商品コード（SKU）", "商品名", "受注数", "売上金額（税込）"
                        // But real NE CSV might have different names.
                        // Let's rely on column INDEX if possible or flexible matching.
                        // Papaparse with header: true uses header names.

                        results.data.forEach((row: any, index: number) => {
                            // Normalize row keys to remove BOM, zero-width chars, and extra whitespace
                            const normalizedRow: any = {};
                            Object.keys(row).forEach(key => {
                                const normalizedKey = key
                                    .replace(/[\uFEFF\u200B-\u200D\u00A0]/g, '') // Remove BOM, zero-width, non-breaking spaces
                                    .replace(/\s+/g, '') // Remove all whitespace
                                    .trim();
                                normalizedRow[normalizedKey] = row[key];
                            });

                            if (index === 0) {
                                console.log('Original keys:', Object.keys(row));
                                console.log('Normalized keys:', Object.keys(normalizedRow));
                            }

                            // Helper to find value by potential keys
                            const findVal = (keys: string[]) => {
                                for (const k of keys) {
                                    const normalizedKey = k.replace(/\s+/g, '');
                                    const val = normalizedRow[normalizedKey];
                                    if (val !== undefined && val !== null && val !== '') {
                                        return String(val).trim();
                                    }
                                }
                                return undefined;

                            };

                            const sku = findVal(['商品コード', '商品ｺｰﾄﾞ', '商品コード（SKU）', 'SKU']);
                            const name = findVal(['商品名', '商品名称']);
                            const qty = findVal(['受注数', '数量', '出荷数']);
                            const amount = findVal(['売上金額（税込）', '金額', '小計', '単価']);

                            if (index < 3) {
                                console.log(`Row ${index}:`, { sku, name, qty, amount });
                            }

                            if (sku && qty && amount) {
                                rows.push({
                                    productCode: sku,
                                    productName: name || '',
                                    quantity: parseInt(String(qty).replace(/,/g, ''), 10),
                                    salesAmount税込: parseFloat(String(amount).replace(/,/g, '')),
                                });
                            }
                        });
                        console.log('Total valid rows extracted:', rows.length);
                        resolve(rows);

                    },
                    error: (err: any) => reject(err),
                });
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(file);
    });
}
