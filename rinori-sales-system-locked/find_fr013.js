
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== 商品マスタ全件確認 ===\n');

    // 全商品を取得（管理中のみ）
    const products = await prisma.product.findMany({
        where: {
            managementStatus: { in: ['管理中', 'managed'] }
        },
        orderBy: {
            productCode: 'asc'
        }
    });

    console.log(`管理中の商品: ${products.length}件\n`);

    // 013を含む商品を探す
    const matching = products.filter(p =>
        p.productCode.includes('013') ||
        p.productName.includes('013') ||
        p.productName.toLowerCase().includes('fr013') ||
        p.productName.toLowerCase().includes('fr-013')
    );

    console.log('013を含む商品:');
    if (matching.length === 0) {
        console.log('  → 見つかりませんでした');
    } else {
        matching.forEach(p => {
            console.log(`  - コード: ${p.productCode}`);
            console.log(`    名称: ${p.productName}`);
            console.log(`    管理: ${p.managementStatus}`);
            console.log('');
        });
    }

    // FRを含む商品も確認
    console.log('\nFRを含む商品コード:');
    const frProducts = products.filter(p =>
        p.productCode.toUpperCase().includes('FR')
    );

    if (frProducts.length === 0) {
        console.log('  → 見つかりませんでした');
    } else {
        frProducts.slice(0, 20).forEach(p => {
            console.log(`  - ${p.productCode}: ${p.productName}`);
        });
        if (frProducts.length > 20) {
            console.log(`  ... 他 ${frProducts.length - 20}件`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
