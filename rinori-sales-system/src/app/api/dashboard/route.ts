import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 現在月を取得（YYYYMM形式）
        const now = new Date();
        const currentMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

        console.log(`[ダッシュボード] 現在月: ${currentMonth}`);

        // 今月の売上データを集計
        const salesData = await prisma.salesRecord.aggregate({
            where: {
                periodYm: currentMonth
            },
            _sum: {
                salesAmountExclTax: true,
                costAmountExclTax: true,
                grossProfit: true
            }
        });

        const sales = salesData._sum.salesAmountExclTax || 0;
        const cost = salesData._sum.costAmountExclTax || 0;
        const grossProfit = salesData._sum.grossProfit || 0;

        // 今月の広告費を集計
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const adExpenseData = await prisma.adExpense.aggregate({
            where: {
                expenseDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            _sum: {
                amount: true
            }
        });

        const adExpense = adExpenseData._sum.amount || 0;
        const operatingProfit = grossProfit - adExpense;

        // 各率を計算
        const costRate = sales > 0 ? (cost / sales) * 100 : 0;
        const grossProfitRate = sales > 0 ? (grossProfit / sales) * 100 : 0;
        const adExpenseRate = sales > 0 ? (adExpense / sales) * 100 : 0;
        const operatingProfitRate = sales > 0 ? (operatingProfit / sales) * 100 : 0;

        console.log(`[ダッシュボード] 売上: ${sales}, 粗利: ${grossProfit}, 営業利益: ${operatingProfit}`);

        // 予算vs実績 上位5商品を取得
        const topProductsData = await prisma.salesRecord.groupBy({
            by: ['productCode'],
            where: {
                periodYm: currentMonth
            },
            _sum: {
                salesAmountExclTax: true,
                quantity: true
            },
            orderBy: {
                _sum: {
                    salesAmountExclTax: 'desc'
                }
            },
            take: 5
        });

        // 商品情報と予算データを取得
        const topProducts = [];
        for (const productData of topProductsData) {
            const product = await prisma.product.findUnique({
                where: { productCode: productData.productCode },
                select: { productName: true }
            });

            const budget = await prisma.monthlyBudget.findFirst({
                where: {
                    productCode: productData.productCode,
                    periodYm: currentMonth
                },
                select: {
                    budgetQuantity: true
                }
            });

            const actualQuantity = productData._sum.quantity || 0;
            const budgetQuantity = budget?.budgetQuantity || 0;
            const achievementRate = budgetQuantity > 0
                ? (actualQuantity / budgetQuantity) * 100
                : 0;

            topProducts.push({
                productCode: productData.productCode,
                productName: product?.productName || '不明',
                budgetQuantity,
                actualQuantity,
                achievementRate: Math.round(achievementRate * 10) / 10
            });
        }

        console.log(`[ダッシュボード] 上位商品: ${topProducts.length}件`);

        // 新商品候補件数を取得
        const newProductCandidatesCount = await prisma.newProductCandidate.count({
            where: {
                status: 'pending'
            }
        });

        console.log(`[ダッシュボード] 新商品候補: ${newProductCandidatesCount}件`);

        return NextResponse.json({
            currentMonth,
            monthlySummary: {
                sales,
                cost,
                grossProfit,
                adExpense,
                operatingProfit,
                costRate: Math.round(costRate * 10) / 10,
                grossProfitRate: Math.round(grossProfitRate * 10) / 10,
                adExpenseRate: Math.round(adExpenseRate * 10) / 10,
                operatingProfitRate: Math.round(operatingProfitRate * 10) / 10
            },
            topProducts,
            newProductCandidatesCount
        });

    } catch (error: any) {
        console.error('[ダッシュボード] エラー発生:', error);
        return NextResponse.json(
            { error: 'ダッシュボードデータの取得に失敗しました: ' + error.message },
            { status: 500 }
        );
    }
}
