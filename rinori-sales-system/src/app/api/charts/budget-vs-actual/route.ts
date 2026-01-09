import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addMonths, format, parse, subYears } from 'date-fns';

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startYm = searchParams.get('startYm');
        const endYm = searchParams.get('endYm');
        const type = searchParams.get('type') || 'product'; // product, category
        const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
        const salesChannelId = searchParams.get('salesChannelId');
        if (!startYm || !endYm) {
            return NextResponse.json({ error: '期間の指定が必要です' }, { status: 400 });
        }

        const channelId = (salesChannelId && salesChannelId !== 'all') ? parseInt(salesChannelId) : null;

        const months: string[] = [];
        let current = parse(startYm, 'yyyy-MM', new Date());
        const end = parse(endYm, 'yyyy-MM', new Date());
        while (current <= end) {
            months.push(format(current, 'yyyy-MM'));
            current = addMonths(current, 1);
        }

        const prevYearMonths = months.map(m => format(subYears(parse(m, 'yyyy-MM', new Date()), 1), 'yyyy-MM'));

        // 実績データ取得
        const actuals = (type === 'overall' || ids.length > 0) ? await prisma.salesRecord.findMany({
            where: {
                periodYm: { in: [...months, ...prevYearMonths] },
                ...(channelId ? { salesChannelId: channelId } : {}),
                ...(type === 'product' && ids.length > 0 ? { productCode: { in: ids } } : {}),
                ...(type === 'category' && ids.length > 0 ? {
                    product: {
                        OR: [
                            {
                                categoryId: {
                                    in: ids
                                        .filter(id => id !== 'null' && id !== 'unclassified')
                                        .map(id => parseInt(id))
                                        .filter(num => !isNaN(num))
                                }
                            },
                            (ids.includes('null') || ids.includes('unclassified')) ? { categoryId: null } : {}
                        ].filter(cond => {
                            const keys = Object.keys(cond);
                            if (keys.length === 0) return false;
                            if (keys[0] === 'categoryId' && (cond as any).categoryId?.in?.length === 0) return false;
                            return true;
                        }) as any
                    }
                } : {})
            },
            include: {
                product: {
                    include: { category: true }
                }
            }
        }) : [];

        // 予算データ取得 (MonthlyBudgetにはsalesChannelIdがない)
        const budgets = (type === 'overall' || ids.length > 0) ? await prisma.monthlyBudget.findMany({
            where: {
                periodYm: { in: months },
                ...(type === 'product' && ids.length > 0 ? { productCode: { in: ids } } : {}),
                ...(type === 'category' && ids.length > 0 ? {
                    product: {
                        OR: [
                            {
                                categoryId: {
                                    in: ids
                                        .filter(id => id !== 'null' && id !== 'unclassified')
                                        .map(id => parseInt(id))
                                        .filter(num => !isNaN(num))
                                }
                            },
                            (ids.includes('null') || ids.includes('unclassified')) ? { categoryId: null } : {}
                        ].filter(cond => {
                            const keys = Object.keys(cond);
                            if (keys.length === 0) return false;
                            if (keys[0] === 'categoryId' && (cond as any).categoryId?.in?.length === 0) return false;
                            return true;
                        }) as any
                    }
                } : {})
            },
            include: {
                product: {
                    include: { category: true }
                }
            }
        }) : [];

        const result = months.map((month, idx) => {
            const prevMonth = prevYearMonths[idx];
            const allCurrentActuals = (actuals as any[]).filter(r => r.periodYm === month);
            const allPrevActuals = (actuals as any[]).filter(r => r.periodYm === prevMonth);
            const allCurrentBudgets = (budgets as any[]).filter(b => b.periodYm === month);

            // 月全体としてのデータ存在判定
            const hasActDataOverall = allCurrentActuals.length > 0;
            const hasPrevDataOverall = allPrevActuals.length > 0;
            const hasBudDataOverall = allCurrentBudgets.length > 0;
            const isFiltered = !!channelId;

            const data: any[] = [];

            if (type === 'overall') {
                const actSales = allCurrentActuals.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                const budSales = allCurrentBudgets.reduce((sum, b) => sum + b.budgetSalesExclTax, 0);
                const prevSales = allPrevActuals.reduce((sum, r) => sum + r.salesAmountExclTax, 0);

                const actGP = allCurrentActuals.reduce((sum, r) => sum + r.grossProfit, 0);
                const budGP = allCurrentBudgets.reduce((sum, b) => sum + b.budgetGrossProfit, 0);
                const prevGP = allPrevActuals.reduce((sum, r) => sum + r.grossProfit, 0);

                const actQty = allCurrentActuals.reduce((sum, r) => sum + (r.quantity || 0), 0);
                const budQty = allCurrentBudgets.reduce((sum, b) => sum + (b.budgetQuantity || 0), 0);
                const prevQty = allPrevActuals.reduce((sum, r) => sum + (r.quantity || 0), 0);

                data.push({
                    id: 'overall',
                    name: '全体',
                    actualSales: hasActDataOverall ? actSales : null,
                    budgetSales: isFiltered ? null : (hasBudDataOverall ? budSales : null),
                    prevYearSales: hasPrevDataOverall ? prevSales : null,
                    actualGrossProfit: hasActDataOverall ? actGP : null,
                    budgetGrossProfit: isFiltered ? null : (hasBudDataOverall ? budGP : null),
                    prevYearGrossProfit: hasPrevDataOverall ? prevGP : null,
                    actualQuantity: hasActDataOverall ? actQty : null,
                    budgetQuantity: isFiltered ? null : (hasBudDataOverall ? budQty : null),
                    prevYearQuantity: hasPrevDataOverall ? prevQty : null,
                    achievementRate: (!isFiltered && hasBudDataOverall && budSales > 0) ? (actSales / budSales) * 100 : (hasBudDataOverall ? 0 : null)
                });
            } else if (type === 'product') {
                const productCodes = ids.length > 0 ? ids : [];
                productCodes.forEach(code => {
                    const cAct = allCurrentActuals.filter(r => r.productCode === code);
                    const pAct = allPrevActuals.filter(r => r.productCode === code);
                    const cBud = allCurrentBudgets.filter(b => b.productCode === code);

                    const actSales = cAct.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                    const budSales = cBud.reduce((sum, b) => sum + b.budgetSalesExclTax, 0);
                    const prevSales = pAct.reduce((sum, r) => sum + r.salesAmountExclTax, 0);

                    const actGP = cAct.reduce((sum, r) => sum + r.grossProfit, 0);
                    const budGP = cBud.reduce((sum, b) => sum + b.budgetGrossProfit, 0);
                    const prevGP = pAct.reduce((sum, r) => sum + r.grossProfit, 0);

                    const actQty = cAct.reduce((sum, r) => sum + (r.quantity || 0), 0);
                    const budQty = cBud.reduce((sum, b) => sum + (b.budgetQuantity || 0), 0);
                    const prevQty = pAct.reduce((sum, r) => sum + (r.quantity || 0), 0);

                    const name = cAct[0]?.product?.productName || cBud[0]?.product?.productName || pAct[0]?.product?.productName || code;

                    data.push({
                        id: code,
                        name,
                        actualSales: hasActDataOverall ? actSales : null,
                        budgetSales: isFiltered ? null : (hasBudDataOverall ? budSales : null),
                        prevYearSales: hasPrevDataOverall ? prevSales : null,
                        actualGrossProfit: hasActDataOverall ? actGP : null,
                        budgetGrossProfit: isFiltered ? null : (hasBudDataOverall ? budGP : null),
                        prevYearGrossProfit: hasPrevDataOverall ? prevGP : null,
                        actualQuantity: hasActDataOverall ? actQty : null,
                        budgetQuantity: isFiltered ? null : (hasBudDataOverall ? budQty : null),
                        prevYearQuantity: hasPrevDataOverall ? prevQty : null,
                        achievementRate: (!isFiltered && hasBudDataOverall && budSales > 0) ? (actSales / budSales) * 100 : (hasBudDataOverall ? 0 : null)
                    });
                });
            } else if (type === 'category') {
                const categoryRequestIds = ids.length > 0 ? ids : [];
                categoryRequestIds.forEach(reqId => {
                    const isUnclassified = reqId === 'unclassified' || reqId === 'null';
                    const catId = isUnclassified ? null : parseInt(reqId);

                    const cAct = allCurrentActuals.filter(r => r.product?.categoryId === catId);
                    const pAct = allPrevActuals.filter(r => r.product?.categoryId === catId);
                    const cBud = allCurrentBudgets.filter(b => b.product?.categoryId === catId);

                    const actSales = cAct.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                    const budSales = cBud.reduce((sum, b) => sum + b.budgetSalesExclTax, 0);
                    const prevSales = pAct.reduce((sum, r) => sum + r.salesAmountExclTax, 0);

                    const actGP = cAct.reduce((sum, r) => sum + r.grossProfit, 0);
                    const budGP = cBud.reduce((sum, b) => sum + b.budgetGrossProfit, 0);
                    const prevGP = pAct.reduce((sum, r) => sum + r.grossProfit, 0);

                    const actQty = cAct.reduce((sum, r) => sum + (r.quantity || 0), 0);
                    const budQty = cBud.reduce((sum, b) => sum + (b.budgetQuantity || 0), 0);
                    const prevQty = pAct.reduce((sum, r) => sum + (r.quantity || 0), 0);

                    const name = cAct[0]?.product?.category?.name || cBud[0]?.product?.category?.name || pAct[0]?.product?.category?.name || (isUnclassified ? '未分類' : `不明(${catId})`);

                    data.push({
                        id: isUnclassified ? 'unclassified' : reqId,
                        name,
                        actualSales: hasActDataOverall ? actSales : null,
                        budgetSales: isFiltered ? null : (hasBudDataOverall ? budSales : null),
                        prevYearSales: hasPrevDataOverall ? prevSales : null,
                        actualGrossProfit: hasActDataOverall ? actGP : null,
                        budgetGrossProfit: isFiltered ? null : (hasBudDataOverall ? budGP : null),
                        prevYearGrossProfit: hasPrevDataOverall ? prevGP : null,
                        actualQuantity: hasActDataOverall ? actQty : null,
                        budgetQuantity: isFiltered ? null : (hasBudDataOverall ? budQty : null),
                        prevYearQuantity: hasPrevDataOverall ? prevQty : null,
                        achievementRate: (!isFiltered && hasBudDataOverall && budSales > 0) ? (actSales / budSales) * 100 : (hasBudDataOverall ? 0 : null)
                    });
                });
            }

            return {
                periodYm: month,
                data
            };
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error('[予算実績グラフAPI] エラー:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
