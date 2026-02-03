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
        const products = await prisma.product.findMany({
            where: {
                // 管理中商品のみ対象（日本語/英語両対応）
                managementStatus: {
                    in: ['管理中', 'managed']
                },
            },
            orderBy: {
                productCode: 'asc',
            },
            include: {
                category: true,
                monthlyBudgets: {
                    where: {
                        periodYm: {
                            gte: startYm,
                            lte: endYm,
                        },
                    },
                },
            },
        });

        const budgetData = products.map(p => {
            let periodTotal = 0;
            const monthlyQty: Record<string, number> = {};

            p.monthlyBudgets.forEach(mb => {
                monthlyQty[mb.periodYm] = mb.budgetQuantity;
                periodTotal += mb.budgetQuantity;
            });

            return {
                productCode: p.productCode,
                productName: p.productName,
                categoryName: p.category?.name || '未分類',
                salesPrice: p.salesPriceExclTax,
                cost: p.costExclTax,
                periodTotal: periodTotal,
                periodSales: p.salesPriceExclTax * periodTotal,
                periodProfit: (p.salesPriceExclTax - p.costExclTax) * periodTotal,
                monthlyQty: monthlyQty,
            };
        });

        return NextResponse.json(budgetData);
    } catch (error) {
        console.error('Failed to fetch budget data:', error);
        return NextResponse.json({ error: 'Failed to fetch budget data' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { startYm, endYm, budgets } = body;

        // budgets: Array<{ productCode, periodTotal, monthlyQty: { [ym]: qty } }>

        await prisma.$transaction(async (tx) => {
            // Fetch all involved products for price calculation
            const productCodes = budgets.map((b: any) => b.productCode);
            const products = await tx.product.findMany({
                where: { productCode: { in: productCodes } },
            });
            const productMap = new Map(products.map(p => [p.productCode, p]));

            for (const budget of budgets) {
                const product = productMap.get(budget.productCode);
                if (!product) continue;

                const totalQty = budget.periodTotal;
                const totalSales = totalQty * product.salesPriceExclTax;

                // 1. Upsert PeriodBudget (Exact match for startYm/endYm)
                let periodBudget = await tx.periodBudget.findFirst({
                    where: {
                        productCode: budget.productCode,
                        startYm,
                        endYm,
                    },
                });

                if (periodBudget) {
                    periodBudget = await tx.periodBudget.update({
                        where: { id: periodBudget.id },
                        data: {
                            totalQuantity: totalQty,
                            totalSalesExclTax: totalSales,
                            updatedAt: new Date(),
                        },
                    });
                } else {
                    periodBudget = await tx.periodBudget.create({
                        data: {
                            productCode: budget.productCode,
                            startYm,
                            endYm,
                            totalQuantity: totalQty,
                            totalSalesExclTax: totalSales,
                            memo: 'Budget setting screen',
                        },
                    });
                }

                // 2. Save PeriodBudgetHistory
                await tx.periodBudgetHistory.create({
                    data: {
                        periodBudgetId: periodBudget.id,
                        productCode: budget.productCode,
                        startYm,
                        endYm,
                        totalQuantity: totalQty,
                        monthlyBreakdown: JSON.stringify(budget.monthlyQty),
                    },
                });

                // 3. Upsert MonthlyBudgets
                for (const [ym, qty] of Object.entries(budget.monthlyQty)) {
                    const quantity = Number(qty);
                    const sales = quantity * product.salesPriceExclTax;
                    const cost = quantity * product.costExclTax;
                    const grossProfit = sales - cost;

                    // Check if exists
                    const existingMonthly = await tx.monthlyBudget.findFirst({
                        where: {
                            productCode: budget.productCode,
                            periodYm: ym,
                        },
                    });

                    if (existingMonthly) {
                        await tx.monthlyBudget.update({
                            where: { id: existingMonthly.id },
                            data: {
                                budgetQuantity: quantity,
                                budgetSalesExclTax: sales,
                                budgetCostExclTax: cost,
                                budgetGrossProfit: grossProfit,
                            },
                        });
                    } else {
                        await tx.monthlyBudget.create({
                            data: {
                                productCode: budget.productCode,
                                periodYm: ym,
                                budgetQuantity: quantity,
                                budgetSalesExclTax: sales,
                                budgetCostExclTax: cost,
                                budgetGrossProfit: grossProfit,
                            },
                        });
                    }
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to save budget:', error);
        return NextResponse.json({ error: 'Failed to save budget' }, { status: 500 });
    }
}
