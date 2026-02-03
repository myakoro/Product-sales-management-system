
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== Fr013 調査 ===\n');

    // 1. 商品マスタの確認
    const products = await prisma.product.findMany({
        where: {
            OR: [
                { productCode: { contains: 'FR013' } },
                { productCode: { contains: 'Fr013' } },
                { productCode: { contains: 'fr013' } }
            ]
        }
    });

    console.log('1. 商品マスタ検索結果:');
    if (products.length === 0) {
        console.log('  → Fr013に該当する商品が見つかりません');
    } else {
        products.forEach(p => {
            console.log(`  - ${p.productCode}: ${p.productName} (管理: ${p.managementStatus})`);
        });
    }

    // 2. 完全一致で確認
    const exactMatch = await prisma.product.findUnique({
        where: { productCode: 'RINO-FR013' }
    });

    console.log('\n2. RINO-FR013 完全一致:');
    if (exactMatch) {
        console.log(`  → 存在します`);
        console.log(`     商品名: ${exactMatch.productName}`);
        console.log(`     管理ステータス: ${exactMatch.managementStatus}`);
        console.log(`     販売価格: ${exactMatch.salesPriceExclTax}`);
        console.log(`     原価: ${exactMatch.costExclTax}`);
    } else {
        console.log('  → 存在しません');
    }

    // 3. 除外キーワードの確認
    const exclusions = await prisma.exclusionKeyword.findMany();

    console.log('\n3. 除外キーワード:');
    if (exclusions.length === 0) {
        console.log('  → 登録なし');
    } else {
        exclusions.forEach(e => {
            console.log(`  - ${e.keyword} (${e.matchType})`);
        });
    }

    // 4. 新商品候補の確認
    const candidates = await prisma.newProductCandidate.findMany({
        where: {
            OR: [
                { productCode: { contains: 'FR013' } },
                { productCode: { contains: 'Fr013' } }
            ]
        }
    });

    console.log('\n4. 新商品候補:');
    if (candidates.length === 0) {
        console.log('  → Fr013関連の候補なし');
    } else {
        candidates.forEach(c => {
            console.log(`  - ${c.productCode}: ${c.productName} (${c.status})`);
        });
    }

    // 5. 売上レコードの確認
    const sales = await prisma.salesRecord.findMany({
        where: {
            periodYm: '2025-02',
            productCode: { contains: 'FR013' }
        }
    });

    console.log('\n5. 2025-02の売上レコード:');
    if (sales.length === 0) {
        console.log('  → Fr013の売上レコードなし');
    } else {
        sales.forEach(s => {
            console.log(`  - ${s.productCode}: 数量=${s.quantity}`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
