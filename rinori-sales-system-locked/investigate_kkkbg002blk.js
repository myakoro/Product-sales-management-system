/**
 * KKKBG002BLK の原価問題調査スクリプト
 * 
 * 調査内容:
 * 1. 商品マスタの原価
 * 2. 2026年1月の売上レコードの原価
 * 3. 原価の不一致を検出
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
    try {
        console.log('========================================');
        console.log('KKKBG002BLK 原価調査');
        console.log('========================================\n');

        const productCode = 'KKKBG002BLK';
        const targetYm = '2026-01';

        // 1. 商品マスタの確認
        console.log('【1. 商品マスタ】');
        const product = await prisma.product.findUnique({
            where: { productCode }
        });

        if (!product) {
            console.log(`❌ 商品コード ${productCode} が商品マスタに存在しません`);
            return;
        }

        console.log(`商品コード: ${product.productCode}`);
        console.log(`商品名: ${product.productName}`);
        console.log(`販売価格（税別）: ${product.salesPriceExclTax}`);
        console.log(`原価（税別）: ${product.costExclTax} ← マスタの原価`);
        console.log(`商品タイプ: ${product.productType}`);
        console.log(`管理ステータス: ${product.managementStatus}`);
        console.log(`最終更新日時: ${product.updatedAt}`);
        console.log('');

        // 2. 2026年1月の売上レコード確認
        console.log('【2. 2026年1月の売上レコード】');
        const salesRecords = await prisma.salesRecord.findMany({
            where: {
                productCode,
                periodYm: targetYm
            },
            include: {
                salesChannel: true,
                importHistory: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (salesRecords.length === 0) {
            console.log(`❌ ${targetYm} の売上レコードが見つかりません`);
            return;
        }

        console.log(`売上レコード数: ${salesRecords.length}件\n`);

        salesRecords.forEach((record, index) => {
            console.log(`--- レコード ${index + 1} ---`);
            console.log(`ID: ${record.id}`);
            console.log(`販路: ${record.salesChannel?.name || 'N/A'} (ID: ${record.salesChannelId})`);
            console.log(`売上日: ${record.salesDate.toISOString().split('T')[0]}`);
            console.log(`数量: ${record.quantity}`);
            console.log(`売上金額（税別）: ${record.salesAmountExclTax}`);
            console.log(`原価金額（税別）: ${record.costAmountExclTax} ← レコードの原価`);
            console.log(`粗利: ${record.grossProfit}`);
            console.log(`外部受注ID: ${record.externalOrderId || 'N/A'}`);
            console.log(`取込履歴ID: ${record.importHistoryId}`);
            console.log(`取込方法: ${record.importHistory?.dataSource || 'N/A'}`);
            console.log(`取込コメント: ${record.importHistory?.comment || 'N/A'}`);
            console.log(`作成日時: ${record.createdAt}`);

            // 原価の検証
            const expectedCostAmount = product.costExclTax * record.quantity;
            const actualCostAmount = record.costAmountExclTax;
            const costDifference = actualCostAmount - expectedCostAmount;

            console.log('');
            console.log('【原価検証】');
            console.log(`マスタの単価原価: ${product.costExclTax}`);
            console.log(`数量: ${record.quantity}`);
            console.log(`期待される原価金額: ${expectedCostAmount} (= ${product.costExclTax} × ${record.quantity})`);
            console.log(`実際の原価金額: ${actualCostAmount}`);
            console.log(`差分: ${costDifference}`);

            if (Math.abs(costDifference) > 0.01) {
                console.log(`⚠️ 原価が一致しません！ 差分: ${costDifference}`);
                console.log(`推測される同期時の単価原価: ${actualCostAmount / record.quantity}`);
            } else {
                console.log(`✅ 原価は正しいです`);
            }
            console.log('');
        });

        // 3. 商品マスタの更新履歴を確認（もし更新があった場合）
        console.log('【3. 商品マスタ更新履歴の確認】');
        console.log(`現在の原価（税別）: ${product.costExclTax}`);
        console.log(`最終更新日時: ${product.updatedAt}`);
        console.log('');

        // 4. 全ての売上レコードの原価を確認
        console.log('【4. 全期間の売上レコード原価サマリー】');
        const allSalesRecords = await prisma.salesRecord.findMany({
            where: { productCode },
            orderBy: { periodYm: 'asc' }
        });

        const costSummary = new Map();
        allSalesRecords.forEach(record => {
            const unitCost = record.quantity > 0 ? record.costAmountExclTax / record.quantity : 0;
            const key = `${record.periodYm}`;
            if (!costSummary.has(key)) {
                costSummary.set(key, []);
            }
            costSummary.get(key).push({
                unitCost,
                quantity: record.quantity,
                totalCost: record.costAmountExclTax,
                channelId: record.salesChannelId
            });
        });

        console.log('期間別の原価単価:');
        for (const [period, records] of costSummary.entries()) {
            console.log(`\n${period}:`);
            records.forEach((r, i) => {
                console.log(`  レコード${i + 1}: 単価原価=${r.unitCost}, 数量=${r.quantity}, 原価合計=${r.totalCost}, 販路ID=${r.channelId}`);
            });
        }

        console.log('\n========================================');
        console.log('調査完了');
        console.log('========================================');

    } catch (error) {
        console.error('エラーが発生しました:', error);
    } finally {
        await prisma.$disconnect();
    }
}

investigate();
