
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userRole = (session.user as any).role; // 'master' or 'staff'

    const { searchParams } = new URL(request.url);
    const startYm = searchParams.get('startYm');
    const endYm = searchParams.get('endYm');
    const salesChannelId = searchParams.get('salesChannelId');

    if (!startYm || !endYm) {
        return NextResponse.json({ error: 'Missing startYm or endYm' }, { status: 400 });
    }

    try {
        // 1. Sales Records (Sales, Cost, GrossProfit)
        // Group by nothing (Total)
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
                    managementStatus: { in: ['managed', '管理中'] }
                },
                ...(salesChannelId && salesChannelId !== 'all' ? { salesChannelId: Number(salesChannelId) } : {})
            }
        });

        // 2. Ad Expenses
        // Calculate total amount within date range
        // startYm (e.g. 2025-01) -> 2025-01-01
        // endYm (e.g. 2025-03) -> 2025-03-31 (approx, or just check string comparison if date is stored as YYYY-MM? No, AdExpense has expenseDate DateTime)

        const startDate = new Date(`${startYm}-01`);
        // Calculate end date: 1st of next month of endYm
        let [endYear, endMonth] = endYm.split('-').map(Number);
        if (endMonth === 12) {
            endYear++;
            endMonth = 1;
        } else {
            endMonth++;
        }
        const endDate = new Date(`${endYear}-${String(endMonth).padStart(2, '0')}-01`);

        const adAgg = await prisma.adExpense.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                expenseDate: {
                    gte: startDate,
                    lt: endDate,
                }
            }
        });

        // 3. Ad Budgets (aggregated over the target period)
        const adBudgetAgg = await prisma.adBudget.aggregate({
            _sum: {
                amount: true,
            },
            where: {
                periodYm: {
                    gte: startYm,
                    lte: endYm,
                }
            }
        });

        // 4. Product Budgets (to calculate budget gross profit)
        const productBudgetAgg = await prisma.monthlyBudget.aggregate({
            _sum: {
                budgetQuantity: true,
                budgetSalesExclTax: true,
                budgetCostExclTax: true,
                budgetGrossProfit: true,
            },
            where: {
                periodYm: {
                    gte: startYm,
                    lte: endYm,
                },
                product: {
                    managementStatus: { in: ['managed', '管理中'] }
                }
            }
        });

        const totalSales = salesAgg._sum.salesAmountExclTax || 0;
        const totalCost = salesAgg._sum.costAmountExclTax || 0;
        const totalGrossProfit = salesAgg._sum.grossProfit || 0;

        // Ad expenses/budgets are not linked to sales channels, so return null/0 if filtering by channel
        const isChannelFiltered = !!(salesChannelId && salesChannelId !== 'all');
        const totalAd = isChannelFiltered ? 0 : (adAgg._sum.amount || 0);
        const totalAdBudget = isChannelFiltered ? null : (adBudgetAgg._sum.amount || 0);

        const operatingProfit = totalGrossProfit - totalAd;

        // Budget calculations
        const grossProfitBudget = productBudgetAgg._sum.budgetGrossProfit || 0;
        const operatingProfitBudget = isChannelFiltered ? null : (grossProfitBudget - (totalAdBudget || 0));

        // Achievement rates and variances
        const adVariance = isChannelFiltered ? null : (totalAd - (totalAdBudget || 0));
        const adAchievementRate = isChannelFiltered ? null : (totalAdBudget && totalAdBudget > 0 ? (totalAd / totalAdBudget) * 100 : 0);

        const opVariance = isChannelFiltered ? null : (operatingProfit - (operatingProfitBudget || 0));
        const opAchievementRate = isChannelFiltered ? null : (operatingProfitBudget && operatingProfitBudget !== 0 ? (operatingProfit / operatingProfitBudget) * 100 : 0);

        const gpVariance = totalGrossProfit - grossProfitBudget;
        const gpAchievementRate = grossProfitBudget && grossProfitBudget > 0 ? (totalGrossProfit / grossProfitBudget) * 100 : 0;

        return NextResponse.json({
            sales: totalSales,
            cost: totalCost,
            grossProfit: totalGrossProfit,
            adExpense: totalAd,
            operatingProfit: operatingProfit,

            // Budgets (v1.53)
            grossProfitBudget,
            adBudget: totalAdBudget,
            operatingProfitBudget,

            // Variances (v1.53)
            grossProfitVariance: gpVariance,
            adVariance,
            operatingProfitVariance: opVariance,

            // Achievement Rates (v1.53)
            grossProfitAchievementRate: gpAchievementRate ? Math.round(gpAchievementRate * 10) / 10 : 0,
            adAchievementRate: adAchievementRate ? Math.round(adAchievementRate * 10) / 10 : 0,
            operatingProfitAchievementRate: opAchievementRate ? Math.round(opAchievementRate * 10) / 10 : 0,

            // Legacy Rates
            costRate: totalSales ? (totalCost / totalSales) * 100 : 0,
            grossProfitRate: totalSales ? (totalGrossProfit / totalSales) * 100 : 0,
            adRate: totalSales ? (totalAd / totalSales) * 100 : 0,
            operatingProfitRate: totalSales ? (operatingProfit / totalSales) * 100 : 0,
        });

    } catch (error) {
        console.error('Failed to fetch PL data:', error);
        return NextResponse.json({ error: 'Failed to fetch PL data' }, { status: 500 });
    }
}
