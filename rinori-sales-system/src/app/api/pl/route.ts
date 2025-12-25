
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startYm = searchParams.get('startYm');
    const endYm = searchParams.get('endYm');
    const salesChannelIdStr = searchParams.get('salesChannelId');

    if (!startYm || !endYm) {
        return NextResponse.json({ error: 'Missing startYm or endYm' }, { status: 400 });
    }

    const salesChannelId = salesChannelIdStr ? parseInt(salesChannelIdStr, 10) : null;
    const isChannelFiltered = salesChannelId !== null && salesChannelId > 0;

    try {
        // 1. Calculate Sales, Cost, Gross Profit from SalesRecords
        // SalesRecord.periodYm is string "YYYY-MM"
        const salesAgg = await prisma.salesRecord.aggregate({
            _sum: {
                salesAmountExclTax: true,
                costAmountExclTax: true,
                grossProfit: true,
            },
            where: {
                periodYm: {
                    gte: startYm,
                    lte: endYm,
                },
                product: {
                    managementStatus: { in: ['管理中', 'managed'] }
                },
                ...(isChannelFiltered ? { salesChannelId: salesChannelId } : {})
            },
        });

        const sales = salesAgg._sum.salesAmountExclTax || 0;
        const cost = salesAgg._sum.costAmountExclTax || 0;
        const grossProfit = salesAgg._sum.grossProfit || 0;

        // 2. Calculate Ad Expenses
        // AdExpense.expenseDate is DateTime
        // We need to convert startYm/endYm to Date ranges for filtering
        const startDate = new Date(`${startYm}-01`);
        // End date should be the last day of endYm
        // To get end of endYm, we can go to next month's 1st day and subtract 1ms (or just use lt next month)
        const [endYear, endMonth] = endYm.split('-').map(Number);
        // Next month
        const endDateLimit = new Date(endYear, endMonth, 1); // Month is 0-indexed in JS Date constructor? No, 2nd arg is index. 1=Feb.
        // Actually: new Date(year, monthIndex) -> 1st day of month.
        // If endYm is 2025-03. endMonth is 3. new Date(2025, 3, 1) is April 1st.
        // So 'lt' April 1st covers March.

        const adAgg = await prisma.adExpense.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                expenseDate: {
                    gte: startDate,
                    lt: endDateLimit,
                },
            },
        });

        // 販路別の場合は広告費・営業利益を返さない（V1.4設計書方針）
        if (isChannelFiltered) {
            return NextResponse.json({
                sales,
                cost,
                grossProfit,
                adExpense: null,
                operatingProfit: null,
                grossProfitBudget: null,
                adBudget: null,
                operatingProfitBudget: null,
                grossProfitVariance: null,
                adVariance: null,
                operatingProfitVariance: null,
                grossProfitAchievementRate: null,
                adAchievementRate: null,
                operatingProfitAchievementRate: null,
            });
        }

        const adExpense = adAgg._sum.amount || 0;

        // 3. Ad Budgets
        const adBudgetAgg = await prisma.adBudget.aggregate({
            _sum: { amount: true },
            where: {
                periodYm: { gte: startYm, lte: endYm }
            }
        });
        const adBudget = adBudgetAgg._sum.amount || 0;

        // 4. Product Budgets (Gross Profit)
        const productBudgetAgg = await prisma.monthlyBudget.aggregate({
            _sum: { budgetGrossProfit: true },
            where: {
                periodYm: { gte: startYm, lte: endYm },
                product: { managementStatus: { in: ['管理中', 'managed'] } }
            }
        });
        const grossProfitBudget = productBudgetAgg._sum.budgetGrossProfit || 0;

        // 5. Logical Calculations
        const operatingProfit = grossProfit - adExpense;
        const operatingProfitBudget = grossProfitBudget - adBudget;

        // Variances
        const grossProfitVariance = grossProfit - grossProfitBudget;
        const adVariance = adExpense - adBudget;
        const operatingProfitVariance = operatingProfit - operatingProfitBudget;

        // Achievement Rates
        const grossProfitAchievementRate = grossProfitBudget > 0 ? (grossProfit / grossProfitBudget) * 100 : 0;
        const adAchievementRate = adBudget > 0 ? (adExpense / adBudget) * 100 : 0;
        const operatingProfitAchievementRate = operatingProfitBudget !== 0 ? (operatingProfit / operatingProfitBudget) * 100 : 0;

        return NextResponse.json({
            sales,
            cost,
            grossProfit,
            adExpense,
            operatingProfit,

            // Budgets (v1.53)
            grossProfitBudget,
            adBudget,
            operatingProfitBudget,

            // Variances (v1.53)
            grossProfitVariance,
            adVariance,
            operatingProfitVariance,

            // Achievement Rates (v1.53)
            grossProfitAchievementRate: Math.round(grossProfitAchievementRate * 10) / 10,
            adAchievementRate: Math.round(adAchievementRate * 10) / 10,
            operatingProfitAchievementRate: Math.round(operatingProfitAchievementRate * 10) / 10,
        });
    } catch (error) {
        console.error('Failed to fetch PL data:', error);
        return NextResponse.json({ error: 'Failed to fetch PL data' }, { status: 500 });
    }
}
