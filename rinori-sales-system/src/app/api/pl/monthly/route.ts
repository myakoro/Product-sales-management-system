
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

        const totalSales = salesAgg._sum.salesAmountExclTax || 0;
        const totalCost = salesAgg._sum.costAmountExclTax || 0;
        const totalGrossProfit = salesAgg._sum.grossProfit || 0;

        // Ad expenses are not linked to sales channels, so return 0 if filtering by channel
        const totalAd = (salesChannelId && salesChannelId !== 'all') ? 0 : (adAgg._sum.amount || 0);

        const operatingProfit = totalGrossProfit - totalAd;

        return NextResponse.json({
            sales: totalSales,
            cost: totalCost,
            grossProfit: totalGrossProfit,
            adExpense: totalAd,
            operatingProfit: operatingProfit,

            // Rates
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
