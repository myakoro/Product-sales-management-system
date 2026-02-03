
// ネクストエンジンAPIのモックテスト
// 実際のAPIレスポンスの構造を確認

const convertSkuToParentCode = (sku) => {
    const cleanSku = sku.trim();
    const match1 = cleanSku.match(/^(RINO-[A-Z0-9]+)/);
    if (match1) return match1[1];
    const match2 = cleanSku.match(/^(RINO[A-Z]+[0-9]{3,4})/);
    if (match2) return match2[1];
    return cleanSku;
};

// テストケース
const testSkus = [
    'RINO-FR013',
    'RINO-FR013-S-BLK',
    'RINO-FR013-M-BLK',
    'RINO-FR013-L-BLK',
    'RINO-FR013-S-WHT',
    'RINO-FR013-M-WHT',
    'Fr013',
    'FR013',
    'RINO-Fr013',
    'RINO-Fr013-M-BLK'
];

console.log('=== SKU変換テスト ===\n');
testSkus.forEach(sku => {
    const parent = convertSkuToParentCode(sku);
    console.log(`${sku.padEnd(25)} => ${parent}`);
});

// 集計シミュレーション
console.log('\n=== 集計シミュレーション ===\n');

const mockOrderRows = [
    { sku: 'RINO-FR013-S-BLK', qty: 10 },
    { sku: 'RINO-FR013-M-BLK', qty: 15 },
    { sku: 'RINO-FR013-L-BLK', qty: 12 },
    { sku: 'RINO-FR013-S-WHT', qty: 8 },
    { sku: 'RINO-FR013-M-WHT', qty: 10 },
];

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
