const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('テストデータ投入開始...');

    // カテゴリー作成
    const categoryData = [
        { name: '美容・コスメ', displayOrder: 1, isActive: true },
        { name: '健康食品', displayOrder: 2, isActive: true },
        { name: 'サプリメント', displayOrder: 3, isActive: true },
        { name: 'スキンケア', displayOrder: 4, isActive: true },
        { name: 'ヘアケア', displayOrder: 5, isActive: true },
    ];

    const categories = [];
    for (const cat of categoryData) {
        const existing = await prisma.productCategory.findFirst({ where: { name: cat.name } });
        if (!existing) {
            const created = await prisma.productCategory.create({ data: cat });
            categories.push(created);
        } else {
            categories.push(existing);
        }
    }

    console.log('カテゴリー作成完了:', categories.length);

    // 販路取得（既存の販路を使用）
    let salesChannel = await prisma.salesChannel.findFirst();
    if (!salesChannel) {
        salesChannel = await prisma.salesChannel.create({
            data: { name: 'テスト販路', isActive: true }
        });
    }

    // 商品作成
    const products = [
        { code: 'RINO-FR001', name: 'リノリ美容液', categoryId: categories[0].id, salesPrice: 5000, cost: 2000 },
        { code: 'RINO-FR002', name: 'リノリクリーム', categoryId: categories[0].id, salesPrice: 4500, cost: 1800 },
        { code: 'RINOBG001', name: '健康ドリンク', categoryId: categories[1].id, salesPrice: 3000, cost: 1200 },
        { code: 'RINOBG002', name: '青汁パウダー', categoryId: categories[1].id, salesPrice: 3500, cost: 1400 },
        { code: 'RINO-SY001', name: 'ビタミンC', categoryId: categories[2].id, salesPrice: 2000, cost: 800 },
        { code: 'RINO-SY002', name: 'コラーゲン', categoryId: categories[2].id, salesPrice: 2500, cost: 1000 },
        { code: 'SKIN001', name: 'フェイスマスク', categoryId: categories[3].id, salesPrice: 1500, cost: 600 },
        { code: 'SKIN002', name: '化粧水', categoryId: categories[3].id, salesPrice: 3000, cost: 1200 },
        { code: 'HAIR001', name: 'シャンプー', categoryId: categories[4].id, salesPrice: 2800, cost: 1100 },
        { code: 'HAIR002', name: 'トリートメント', categoryId: categories[4].id, salesPrice: 3200, cost: 1300 },
    ];

    for (const p of products) {
        await prisma.product.upsert({
            where: { productCode: p.code },
            update: {
                productName: p.name,
                categoryId: p.categoryId,
                salesPriceExclTax: p.salesPrice,
                costExclTax: p.cost,
                productType: '自社',
                managementStatus: '管理中'
            },
            create: {
                productCode: p.code,
                productName: p.name,
                categoryId: p.categoryId,
                salesPriceExclTax: p.salesPrice,
                costExclTax: p.cost,
                productType: '自社',
                managementStatus: '管理中'
            }
        });
    }

    console.log('商品作成完了:', products.length);

    // adminユーザー取得
    const adminUser = await prisma.user.findFirst({ where: { role: 'master' } });
    if (!adminUser) {
        throw new Error('adminユーザーが見つかりません。先にdb:seedを実行してください。');
    }

    // インポート履歴作成
    const importHistory = await prisma.importHistory.create({
        data: {
            importType: 'sales',
            targetYm: '2026-01',
            importMode: 'append',
            dataSource: 'テストデータ',
            comment: 'カテゴリー別PLテスト用データ',
            salesChannelId: salesChannel.id,
            recordCount: 0,
            importedByUserId: adminUser.id
        }
    });

    // 売上データ作成（2026年1月〜3月）
    const salesData = [
        // 1月
        { code: 'RINO-FR001', ym: '2026-01', qty: 100, date: '2026-01-15' },
        { code: 'RINO-FR002', ym: '2026-01', qty: 80, date: '2026-01-15' },
        { code: 'RINOBG001', ym: '2026-01', qty: 150, date: '2026-01-15' },
        { code: 'RINOBG002', ym: '2026-01', qty: 120, date: '2026-01-15' },
        { code: 'RINO-SY001', ym: '2026-01', qty: 200, date: '2026-01-15' },
        { code: 'RINO-SY002', ym: '2026-01', qty: 180, date: '2026-01-15' },
        { code: 'SKIN001', ym: '2026-01', qty: 250, date: '2026-01-15' },
        { code: 'SKIN002', ym: '2026-01', qty: 90, date: '2026-01-15' },
        { code: 'HAIR001', ym: '2026-01', qty: 110, date: '2026-01-15' },
        { code: 'HAIR002', ym: '2026-01', qty: 100, date: '2026-01-15' },
        // 2月
        { code: 'RINO-FR001', ym: '2026-02', qty: 120, date: '2026-02-15' },
        { code: 'RINO-FR002', ym: '2026-02', qty: 90, date: '2026-02-15' },
        { code: 'RINOBG001', ym: '2026-02', qty: 160, date: '2026-02-15' },
        { code: 'RINOBG002', ym: '2026-02', qty: 130, date: '2026-02-15' },
        { code: 'RINO-SY001', ym: '2026-02', qty: 220, date: '2026-02-15' },
        { code: 'RINO-SY002', ym: '2026-02', qty: 190, date: '2026-02-15' },
        { code: 'SKIN001', ym: '2026-02', qty: 270, date: '2026-02-15' },
        { code: 'SKIN002', ym: '2026-02', qty: 100, date: '2026-02-15' },
        { code: 'HAIR001', ym: '2026-02', qty: 120, date: '2026-02-15' },
        { code: 'HAIR002', ym: '2026-02', qty: 110, date: '2026-02-15' },
        // 3月
        { code: 'RINO-FR001', ym: '2026-03', qty: 140, date: '2026-03-15' },
        { code: 'RINO-FR002', ym: '2026-03', qty: 100, date: '2026-03-15' },
        { code: 'RINOBG001', ym: '2026-03', qty: 170, date: '2026-03-15' },
        { code: 'RINOBG002', ym: '2026-03', qty: 140, date: '2026-03-15' },
        { code: 'RINO-SY001', ym: '2026-03', qty: 240, date: '2026-03-15' },
        { code: 'RINO-SY002', ym: '2026-03', qty: 200, date: '2026-03-15' },
        { code: 'SKIN001', ym: '2026-03', qty: 290, date: '2026-03-15' },
        { code: 'SKIN002', ym: '2026-03', qty: 110, date: '2026-03-15' },
        { code: 'HAIR001', ym: '2026-03', qty: 130, date: '2026-03-15' },
        { code: 'HAIR002', ym: '2026-03', qty: 120, date: '2026-03-15' },
    ];

    for (const sale of salesData) {
        const product = await prisma.product.findUnique({
            where: { productCode: sale.code }
        });

        if (product) {
            const salesAmount = product.salesPriceExclTax * sale.qty;
            const costAmount = product.costExclTax * sale.qty;
            const grossProfit = salesAmount - costAmount;

            await prisma.salesRecord.create({
                data: {
                    periodYm: sale.ym,
                    salesDate: new Date(sale.date),
                    productCode: sale.code,
                    salesChannelId: salesChannel.id,
                    quantity: sale.qty,
                    salesAmountExclTax: salesAmount,
                    costAmountExclTax: costAmount,
                    grossProfit: grossProfit,
                    importHistoryId: importHistory.id,
                    createdByUserId: adminUser.id
                }
            });
        }
    }

    console.log('売上データ作成完了:', salesData.length);
    console.log('テストデータ投入完了！');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
