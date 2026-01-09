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
        const type = searchParams.get('type') || 'overall'; // overall, product, category
        const ids = searchParams.get('ids')?.split(',').filter(Boolean) || [];
        const salesChannelId = searchParams.get('salesChannelId');

        if (!startYm || !endYm) {
            return NextResponse.json({ error: '期間(startYm, endYm)の指定が必要です' }, { status: 400 });
        }

        // 月次リスト作成 (例: 2025-01 から 2025-12)
        const months: string[] = [];
        let current = parse(startYm, 'yyyy-MM', new Date());
        const end = parse(endYm, 'yyyy-MM', new Date());
        while (current <= end) {
            months.push(format(current, 'yyyy-MM'));
            current = addMonths(current, 1);
        };

        // 昨年同期間の月次リスト
        const prevYearMonths = months.map(m => format(subYears(parse(m, 'yyyy-MM', new Date()), 1), 'yyyy-MM'));

        // 実績データ取得 (今年分 + 昨年分)
        const salesRecords = (type === 'overall' || ids.length > 0) ? await prisma.salesRecord.findMany({
            where: {
                periodYm: { in: [...months, ...prevYearMonths] },
                ...(salesChannelId ? { salesChannelId: parseInt(salesChannelId) } : {}),
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
                    include: {
                        category: true
                    }
                }
            }
        }) : [];

        // 広告費取得 (全体PLの場合のみ)
        let adExpenses: any[] = [];
        if (type === 'overall' && !salesChannelId) {
            const startDate = parse(months[0], 'yyyy-MM', new Date());
            const endDate = addMonths(parse(months[months.length - 1], 'yyyy-MM', new Date()), 1);
            const prevStartDate = subYears(startDate, 1);
            const prevEndDate = subYears(endDate, 1);

            adExpenses = await prisma.adExpense.findMany({
                where: {
                    OR: [
                        { expenseDate: { gte: startDate, lt: endDate } },
                        { expenseDate: { gte: prevStartDate, lt: prevEndDate } }
                    ]
                }
            });
        }

        // 月別・ID別に集約
        const result = months.map((month, idx) => {
            const prevMonth = prevYearMonths[idx];

            // フィルタリング（月全体の実績有無を確認用）
            const allCurrentSales = (salesRecords as any[]).filter(r => r.periodYm === month);
            const allPrevSales = (salesRecords as any[]).filter(r => r.periodYm === prevMonth);

            // 月全体としてのデータ存在判定
            const hasActDataOverall = allCurrentSales.length > 0;
            const hasPrevDataOverall = allPrevSales.length > 0;
            const isFiltered = !!salesChannelId;

            const data: any[] = [];

            if (type === 'overall') {
                const sales = allCurrentSales.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                const salesPrev = allPrevSales.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                const gp = allCurrentSales.reduce((sum, r) => sum + r.grossProfit, 0);
                const gpPrev = allPrevSales.reduce((sum, r) => sum + r.grossProfit, 0);

                const currentSga = adExpenses.filter(e => format(e.expenseDate, 'yyyy-MM') === month).reduce((sum, e) => sum + e.amount, 0);
                const prevSga = adExpenses.filter(e => format(e.expenseDate, 'yyyy-MM') === prevMonth).reduce((sum, e) => sum + e.amount, 0);

                data.push({
                    id: 'overall',
                    name: '全体',
                    sales: hasActDataOverall ? sales : null,
                    salesPrevYear: hasPrevDataOverall ? salesPrev : null,
                    grossProfit: hasActDataOverall ? gp : null,
                    grossProfitPrevYear: hasPrevDataOverall ? gpPrev : null,
                    sga: isFiltered ? null : (hasActDataOverall ? currentSga : null),
                    operatingProfit: isFiltered ? null : (hasActDataOverall ? (gp - currentSga) : null),
                    operatingProfitPrevYear: (isFiltered || !hasPrevDataOverall) ? null : (gpPrev - prevSga),
                    grossProfitRate: (hasActDataOverall && sales > 0) ? (gp / sales) * 100 : (hasActDataOverall ? 0 : null)
                });
            } else if (type === 'product') {
                const productCodes = ids.length > 0 ? ids : [];
                productCodes.forEach(code => {
                    const cRows = allCurrentSales.filter(r => r.productCode === code);
                    const pRows = allPrevSales.filter(r => r.productCode === code);

                    const sales = cRows.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                    const salesPrev = pRows.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                    const gp = cRows.reduce((sum, r) => sum + r.grossProfit, 0);
                    const gpPrev = pRows.reduce((sum, r) => sum + r.grossProfit, 0);
                    const name = cRows[0]?.product?.productName || pRows[0]?.product?.productName || code;

                    data.push({
                        id: code,
                        name,
                        sales: hasActDataOverall ? sales : null,
                        salesPrevYear: hasPrevDataOverall ? salesPrev : null,
                        grossProfit: hasActDataOverall ? gp : null,
                        grossProfitPrevYear: hasPrevDataOverall ? gpPrev : null,
                        grossProfitRate: (hasActDataOverall && sales > 0) ? (gp / sales) * 100 : (hasActDataOverall ? 0 : null)
                    });
                });
            } else if (type === 'category') {
                const categoryRequestIds = ids.length > 0 ? ids : [];
                categoryRequestIds.forEach(reqId => {
                    const isUnclassified = reqId === 'unclassified' || reqId === 'null';
                    const catId = isUnclassified ? null : parseInt(reqId);

                    const cRows = allCurrentSales.filter(r => r.product?.categoryId === catId);
                    const pRows = allPrevSales.filter(r => r.product?.categoryId === catId);

                    const sales = cRows.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                    const salesPrev = pRows.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
                    const gp = cRows.reduce((sum, r) => sum + r.grossProfit, 0);
                    const gpPrev = pRows.reduce((sum, r) => sum + r.grossProfit, 0);
                    const name = cRows[0]?.product?.category?.name || pRows[0]?.product?.category?.name || (isUnclassified ? '未分類' : `不明(${catId})`);

                    data.push({
                        id: isUnclassified ? 'unclassified' : reqId,
                        name,
                        sales: hasActDataOverall ? sales : null,
                        salesPrevYear: hasPrevDataOverall ? salesPrev : null,
                        grossProfit: hasActDataOverall ? gp : null,
                        grossProfitPrevYear: hasPrevDataOverall ? gpPrev : null,
                        grossProfitRate: (hasActDataOverall && sales > 0) ? (gp / sales) * 100 : (hasActDataOverall ? 0 : null)
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
        console.error('[PL推移グラフAPI] エラー:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
