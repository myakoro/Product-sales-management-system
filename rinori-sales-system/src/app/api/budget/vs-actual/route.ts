import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const startYm = searchParams.get('startYm');
        const endYm = searchParams.get('endYm');
        const salesChannelIdStr = searchParams.get('salesChannelId');
        const salesChannelId = (salesChannelIdStr && salesChannelIdStr !== 'all') ? parseInt(salesChannelIdStr, 10) : null;

        if (!startYm || !endYm) {
            return NextResponse.json(
                { error: '開始年月と終了年月を指定してください' },
                { status: 400 }
            );
        }

        console.log(`[予実集計] 期間: ${startYm} 〜 ${endYm}`);

        // 管理中の商品を取得（日本語/英語両対応）
        const products = await prisma.product.findMany({
            where: {
                managementStatus: {
                    in: ['管理中', 'managed']
                }
            },
            select: {
                productCode: true,
                productName: true,
                salesPriceExclTax: true
            }
        });

        console.log(`[予実集計] 管理中商品: ${products.length}件`);

        // 予算データを集計
        const budgetData = await prisma.monthlyBudget.groupBy({
            by: ['productCode'],
            where: {
                periodYm: {
                    gte: startYm,
                    lte: endYm
                }
            },
            _sum: {
                budgetQuantity: true,
                budgetSalesExclTax: true,
                budgetCostExclTax: true,
                budgetGrossProfit: true
            }
        });

        const budgetMap = new Map(
            budgetData.map(b => [
                b.productCode,
                {
                    quantity: b._sum.budgetQuantity || 0,
                    sales: b._sum.budgetSalesExclTax || 0,
                    cost: b._sum.budgetCostExclTax || 0,
                    grossProfit: b._sum.budgetGrossProfit || 0
                }
            ])
        );

        console.log(`[予実集計] 予算データ: ${budgetData.length}件`);

        // 実績データを集計
        const actualData = await prisma.salesRecord.groupBy({
            by: ['productCode'],
            where: {
                periodYm: {
                    gte: startYm,
                    lte: endYm
                },
                ...(salesChannelId ? { salesChannelId: salesChannelId } : {})
            },
            _sum: {
                quantity: true,
                salesAmountExclTax: true,
                costAmountExclTax: true,
                grossProfit: true
            }
        });

        const actualMap = new Map(
            actualData.map(a => [
                a.productCode,
                {
                    quantity: a._sum.quantity || 0,
                    sales: a._sum.salesAmountExclTax || 0,
                    cost: a._sum.costAmountExclTax || 0,
                    grossProfit: a._sum.grossProfit || 0
                }
            ])
        );

        console.log(`[予実集計] 実績データ: ${actualData.length}件`);

        // 商品別データを作成
        const productResults = [];
        let totalBudgetQuantity = 0;
        let totalActualQuantity = 0;
        let totalBudgetSales = 0;
        let totalActualSales = 0;
        let totalBudgetCost = 0;
        let totalActualCost = 0;
        let totalBudgetGrossProfit = 0;
        let totalActualGrossProfit = 0;

        for (const product of products) {
            const budget = budgetMap.get(product.productCode) || { quantity: 0, sales: 0, cost: 0, grossProfit: 0 };
            const actual = actualMap.get(product.productCode) || { quantity: 0, sales: 0, cost: 0, grossProfit: 0 };

            // 予算・実績の両方が完全に0の場合のみスキップ
            if (
                budget.quantity === 0 &&
                budget.sales === 0 &&
                budget.cost === 0 &&
                budget.grossProfit === 0 &&
                actual.quantity === 0 &&
                actual.sales === 0 &&
                actual.cost === 0 &&
                actual.grossProfit === 0
            ) {
                continue;
            }

            const quantityAchievementRate = budget.quantity > 0
                ? (actual.quantity / budget.quantity) * 100
                : 0;

            const salesAchievementRate = budget.sales > 0
                ? (actual.sales / budget.sales) * 100
                : 0;

            const grossProfitAchievementRate = budget.grossProfit > 0
                ? (actual.grossProfit / budget.grossProfit) * 100
                : 0;

            const budgetGrossProfitRate = budget.sales > 0 ? (budget.grossProfit / budget.sales) * 100 : 0;
            const actualGrossProfitRate = actual.sales > 0 ? (actual.grossProfit / actual.sales) * 100 : 0;

            productResults.push({
                productCode: product.productCode,
                productName: product.productName,
                budgetQuantity: budget.quantity,
                actualQuantity: actual.quantity,
                quantityAchievementRate: Math.round(quantityAchievementRate * 10) / 10,
                budgetSales: budget.sales,
                actualSales: actual.sales,
                salesAchievementRate: Math.round(salesAchievementRate * 10) / 10,
                budgetCost: budget.cost,
                actualCost: actual.cost,
                budgetGrossProfit: budget.grossProfit,
                actualGrossProfit: actual.grossProfit,
                budgetGrossProfitRate: Math.round(budgetGrossProfitRate * 10) / 10,
                actualGrossProfitRate: Math.round(actualGrossProfitRate * 10) / 10,
                grossProfitAchievementRate: Math.round(grossProfitAchievementRate * 10) / 10
            });

            totalBudgetQuantity += budget.quantity;
            totalActualQuantity += actual.quantity;
            totalBudgetSales += budget.sales;
            totalActualSales += actual.sales;
            totalBudgetCost += budget.cost;
            totalActualCost += actual.cost;
            totalBudgetGrossProfit += budget.grossProfit;
            totalActualGrossProfit += actual.grossProfit;
        }

        // サマリーを計算
        const totalQuantityAchievementRate = totalBudgetQuantity > 0
            ? (totalActualQuantity / totalBudgetQuantity) * 100
            : 0;

        const totalSalesAchievementRate = totalBudgetSales > 0
            ? (totalActualSales / totalBudgetSales) * 100
            : 0;

        const totalGrossProfitAchievementRate = totalBudgetGrossProfit > 0
            ? (totalActualGrossProfit / totalBudgetGrossProfit) * 100
            : 0;

        const totalBudgetGrossProfitRate = totalBudgetSales > 0
            ? (totalBudgetGrossProfit / totalBudgetSales) * 100
            : 0;

        const totalActualGrossProfitRate = totalActualSales > 0
            ? (totalActualGrossProfit / totalActualSales) * 100
            : 0;

        const summary = {
            totalBudgetQuantity,
            totalActualQuantity,
            totalQuantityAchievementRate: Math.round(totalQuantityAchievementRate * 10) / 10,
            totalBudgetSales,
            totalActualSales,
            totalSalesAchievementRate: Math.round(totalSalesAchievementRate * 10) / 10,
            totalBudgetCost,
            totalActualCost,
            totalBudgetGrossProfit,
            totalActualGrossProfit,
            totalBudgetGrossProfitRate: Math.round(totalBudgetGrossProfitRate * 10) / 10,
            totalActualGrossProfitRate: Math.round(totalActualGrossProfitRate * 10) / 10,
            totalGrossProfitAchievementRate: Math.round(totalGrossProfitAchievementRate * 10) / 10
        };

        console.log(`[予実集計] 結果: ${productResults.length}商品`);

        // 予算データが存在するかチェック
        const hasBudgetData = totalBudgetQuantity > 0 || totalBudgetSales > 0 || totalBudgetGrossProfit > 0;

        return NextResponse.json({
            period: {
                startYm,
                endYm
            },
            products: productResults,
            summary,
            hasBudgetData  // 予算データの有無を追加
        });

    } catch (error: any) {
        console.error('[予実集計] エラー発生:', error);
        return NextResponse.json(
            { error: '予実集計に失敗しました: ' + error.message },
            { status: 500 }
        );
    }
}
