// サンプルデータ投入スクリプト
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('サンプルデータを投入します...');

    // ユーザーを確認（既存のadminユーザーを使用）
    let user = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!user) {
        console.log('adminユーザーが見つかりません。作成します...');
        const bcrypt = require('bcryptjs');
        const hash = await bcrypt.hash('admin', 10);
        user = await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash: hash,
                role: 'master',
            },
        });
    }

    // 商品マスタを確認・作成
    const products = [
        { productCode: 'RINO-FR001', productName: 'テスト商品A', salesPriceExclTax: 10000, costExclTax: 4500, productType: '自社', managementStatus: '管理中' },
        { productCode: 'RINO-FR002', productName: 'テスト商品B', salesPriceExclTax: 15000, costExclTax: 6000, productType: '自社', managementStatus: '管理中' },
        { productCode: 'RINO-FR003', productName: 'テスト商品C', salesPriceExclTax: 15000, costExclTax: 6250, productType: '自社', managementStatus: '管理中' },
        { productCode: 'RINO-FR004', productName: 'テスト商品D', salesPriceExclTax: 15000, costExclTax: 6667, productType: '自社', managementStatus: '管理中' },
        { productCode: 'RINO-FR005', productName: 'テスト商品E', salesPriceExclTax: 15000, costExclTax: 6000, productType: '自社', managementStatus: '管理中' },
    ];

    for (const prod of products) {
        await prisma.product.upsert({
            where: { productCode: prod.productCode },
            update: {
                salesPriceExclTax: prod.salesPriceExclTax,
                costExclTax: prod.costExclTax
            },
            create: {
                productCode: prod.productCode,
                productName: prod.productName,
                salesPriceExclTax: prod.salesPriceExclTax,
                costExclTax: prod.costExclTax,
                productType: prod.productType,
                managementStatus: prod.managementStatus,
                categoryId: null,
            },
        });
    }
    console.log('商品マスタを作成/更新しました');

    // 販路を確認・作成
    const channels = [
        { name: '楽天市場' },
        { name: 'Amazon' },
        { name: 'Yahoo!ショッピング' },
        { name: '自社EC' },
    ];

    for (const ch of channels) {
        await prisma.salesChannel.upsert({
            where: { name: ch.name },
            update: {},
            create: { name: ch.name, isActive: true },
        });
    }
    console.log('販路を作成/更新しました');

    // 販路IDを取得
    const rakuten = await prisma.salesChannel.findUnique({ where: { name: '楽天市場' } });
    const amazon = await prisma.salesChannel.findUnique({ where: { name: 'Amazon' } });
    const yahoo = await prisma.salesChannel.findUnique({ where: { name: 'Yahoo!ショッピング' } });
    const ec = await prisma.salesChannel.findUnique({ where: { name: '自社EC' } });

    // インポート履歴を作成
    const importHistory = await prisma.importHistory.create({
        data: {
            importType: 'sales',
            targetYm: '2026-01',
            importMode: 'append',
            comment: 'サンプルデータ（テスト用）',
            recordCount: 10,
            importedByUserId: user.id,
        },
    });
    console.log('インポート履歴を作成しました');

    // 売上データを投入
    const salesData = [
        { productCode: 'RINO-FR001', orderDate: '2026-01-05', quantity: 10, subtotal: 100000, salesChannelId: rakuten.id },
        { productCode: 'RINO-FR002', orderDate: '2026-01-08', quantity: 5, subtotal: 75000, salesChannelId: amazon.id },
        { productCode: 'RINO-FR003', orderDate: '2026-01-12', quantity: 8, subtotal: 120000, salesChannelId: yahoo.id },
        { productCode: 'RINO-FR001', orderDate: '2026-01-15', quantity: 12, subtotal: 120000, salesChannelId: rakuten.id },
        { productCode: 'RINO-FR004', orderDate: '2026-01-18', quantity: 6, subtotal: 90000, salesChannelId: ec.id },
        { productCode: 'RINO-FR002', orderDate: '2026-01-20', quantity: 7, subtotal: 105000, salesChannelId: amazon.id },
        { productCode: 'RINO-FR003', orderDate: '2026-01-22', quantity: 10, subtotal: 150000, salesChannelId: yahoo.id },
        { productCode: 'RINO-FR005', orderDate: '2026-01-25', quantity: 15, subtotal: 225000, salesChannelId: rakuten.id },
        { productCode: 'RINO-FR001', orderDate: '2026-01-28', quantity: 8, subtotal: 80000, salesChannelId: amazon.id },
        { productCode: 'RINO-FR004', orderDate: '2026-01-30', quantity: 9, subtotal: 135000, salesChannelId: ec.id },
    ];

    let count = 0;
    for (const sale of salesData) {
        const product = await prisma.product.findUnique({
            where: { productCode: sale.productCode },
        });

        if (!product) {
            console.log(`商品が見つかりません: ${sale.productCode}`);
            continue;
        }

        const costAmount = product.costExclTax * sale.quantity;
        const grossProfit = sale.subtotal - costAmount;

        await prisma.salesRecord.create({
            data: {
                productCode: product.productCode,
                periodYm: '2026-01',
                salesDate: new Date(sale.orderDate),
                quantity: sale.quantity,
                salesAmountExclTax: sale.subtotal,
                costAmountExclTax: costAmount,
                grossProfit: grossProfit,
                salesChannelId: sale.salesChannelId,
                importHistoryId: importHistory.id,
                createdByUserId: user.id,
            },
        });
        count++;
    }

    console.log(`${count}件の売上データを投入しました`);

    // 集計結果を表示
    const total = await prisma.salesRecord.aggregate({
        where: {
            periodYm: '2026-01',
        },
        _sum: {
            salesAmountExclTax: true,
            costAmountExclTax: true,
            grossProfit: true,
        },
    });

    const sales = total._sum.salesAmountExclTax || 0;
    const cost = total._sum.costAmountExclTax || 0;
    const grossProfit = total._sum.grossProfit || 0;
    const grossProfitRate = sales > 0 ? (grossProfit / sales * 100).toFixed(1) : 0;

    console.log('\n=== 2026年1月 集計結果 ===');
    console.log(`売上高: ¥${sales.toLocaleString()}`);
    console.log(`原価: ¥${cost.toLocaleString()}`);
    console.log(`粗利: ¥${grossProfit.toLocaleString()} (${grossProfitRate}%)`);
    console.log('\nブラウザで http://localhost:3000/pl にアクセスし、');
    console.log('期間を「2026-01」に設定して「表示」ボタンをクリックしてください。');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
