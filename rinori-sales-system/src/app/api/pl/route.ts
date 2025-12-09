
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startYm = searchParams.get('startYm');
    const endYm = searchParams.get('endYm');

    if (!startYm || !endYm) {
        return NextResponse.json({ error: 'Missing startYm or endYm' }, { status: 400 });
    }

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
                    managementStatus: '管理中' // Ensure we only count managed products
                }
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

        const adExpense = adAgg._sum.amount || 0;

        // 3. Calculate Operating Profit
        const operatingProfit = grossProfit - adExpense;

        return NextResponse.json({
            sales,
            cost,
            grossProfit,
            adExpense,
            operatingProfit,
        });
    } catch (error) {
        console.error('Failed to fetch PL data:', error);
        return NextResponse.json({ error: 'Failed to fetch PL data' }, { status: 500 });
    }
}
