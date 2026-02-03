
const { PrismaClient } = require('@prisma/client');

// 本番DBを明示的に指定
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./prisma/prod.db'
        }
    }
});

async function main() {
    console.log('=== 本番DB: Fr013 調査 ===\n');

    // 1. RINO-FR013の確認
    const fr013 = await prisma.product.findUnique({
        where: { productCode: 'RINO-FR013' }
    });

    console.log('1. RINO-FR013:');
    if (fr013) {
        console.log(`  ✓ 存在します`);
        console.log(`    商品名: ${fr013.productName}`);
        console.log(`    管理ステータス: ${fr013.managementStatus}`);
        console.log(`    販売価格: ${fr013.salesPriceExclTax}`);
        console.log(`    原価: ${fr013.costExclTax}`);
    } else {
        console.log('  ✗ 存在しません');
    }

    // 2. 2025-02の売上レコード確認
    const sales = await prisma.salesRecord.findMany({
        where: {
            periodYm: '2025-02',
            productCode: 'RINO-FR013'
        }
    });

    console.log('\n2. 2025-02の売上レコード (RINO-FR013):');
    if (sales.length === 0) {
        console.log('  → レコードなし');
    } else {
        sales.forEach(s => {
            console.log(`  - 数量: ${s.quantity}, 売上: ${s.salesAmountExclTax}, 外部ID: ${s.externalOrderId}`);
        });
    }

    // 3. 2025-02の全売上レコード
    const allSales = await prisma.salesRecord.findMany({
        where: {
            periodYm: '2025-02'
        },
        include: {
            product: true
        }
    });

    console.log(`\n3. 2025-02の全売上レコード: ${allSales.length}件`);

    // 商品ごとに集計
    const summary = new Map();
    allSales.forEach(s => {
        if (summary.has(s.productCode)) {
            summary.set(s.productCode, summary.get(s.productCode) + s.quantity);
        } else {
            summary.set(s.productCode, s.quantity);
        }
    });

    console.log('\n商品別集計:');
    Array.from(summary.entries())
        .sort((a, b) => b[1] - a[1])
        .forEach(([code, qty]) => {
            const product = allSales.find(s => s.productCode === code)?.product;
            console.log(`  - ${code}: ${qty}個 (${product?.productName || '不明'})`);
        });
}

main()
    .catch(e => {
        console.error('エラー:', e.message);
        if (e.message.includes('no such table')) {
            console.log('\n本番DBのスキーマが古い可能性があります。');
            console.log('prisma db push を実行してください。');
        }
    })
    .finally(async () => await prisma.$disconnect());
