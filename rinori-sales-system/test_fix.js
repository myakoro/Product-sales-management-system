
// 修正後のテスト
const convertSkuToParentCode = (sku) => {
    const cleanSku = sku.trim();
    const match1 = cleanSku.match(/^(RINO-[A-Z0-9]+)/i);
    if (match1) return match1[1].toUpperCase();
    const match2 = cleanSku.match(/^(RINO[A-Z]+[0-9]{3,4})/i);
    if (match2) return match2[1].toUpperCase();
    return cleanSku;
};

// テストケース
const testSkus = [
    'RINO-FR013',
    'RINO-FR013-S-BLK',
    'RINO-FR013-M-BLK',
    'RINO-FR013-L-BLK',
    'RINO-Fr013-S-BLK',  // 小文字混在
    'RINO-Fr013-M-BLK',  // 小文字混在
    'RINO-fr013-L-WHT',  // 小文字混在
    'Fr013',
    'FR013',
    'RINODO002BLK',
    'RINOdo002BLK',      // 小文字混在
];

console.log('=== 修正後のSKU変換テスト ===\n');
testSkus.forEach(sku => {
    const parent = convertSkuToParentCode(sku);
    console.log(`${sku.padEnd(25)} => ${parent}`);
});

// 実際の問題ケースのシミュレーション
console.log('\n=== 実際の問題ケース（116行 → 55個） ===\n');

// ネクストエンジンから取得される可能性のあるデータ
// 大文字小文字混在のSKUが116行あり、実際には55個の販売だった場合
const mockOrderRows = [];

// Fr013の様々なバリエーション（合計55個）
// しかし、NEのデータ構造によっては1つの受注が複数行に分かれる可能性がある
// 例: 数量1の受注が116行に分かれている（重複カウント）

// パターン1: 正常なケース（55個が正しく集計される）
for (let i = 0; i < 55; i++) {
    mockOrderRows.push({ sku: 'RINO-Fr013-M-BLK', qty: 1 });
}

const aggregated = new Map();
mockOrderRows.forEach(row => {
    const parent = convertSkuToParentCode(row.sku);
    if (aggregated.has(parent)) {
        aggregated.set(parent, aggregated.get(parent) + row.qty);
    } else {
        aggregated.set(parent, row.qty);
    }
});

console.log('受注明細行数:', mockOrderRows.length);
console.log('集計後:');
aggregated.forEach((qty, code) => {
    console.log(`  ${code}: ${qty}個`);
});

console.log('\n【結論】');
console.log('修正前: RINO-Fr013-M-BLK → RINO-F (誤変換)');
console.log('修正後: RINO-Fr013-M-BLK → RINO-FR013 (正しく変換)');
