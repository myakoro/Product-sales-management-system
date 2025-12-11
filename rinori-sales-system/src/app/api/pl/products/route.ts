
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startYm = searchParams.get('startYm');
    const endYm = searchParams.get('endYm');
    const searchTerm = searchParams.get('search') || '';

    if (!startYm || !endYm) {
        return NextResponse.json({ error: 'Missing startYm or endYm' }, { status: 400 });
    }

    try {
        const products = await prisma.product.findMany({
            where: {
                managementStatus: { in: ['管理中', 'managed'] },
                OR: [
                    { productCode: { contains: searchTerm } }, // Default is case insensitive in SQLite? Prisma usually maps well.
                    { productName: { contains: searchTerm } },
                ],
            },
            include: {
                salesRecords: {
                    where: {
                        periodYm: {
                            gte: startYm,
                            lte: endYm,
                        },
                    },
                },
            },
        });

        const productPlData = products.map(p => {
            const sales = p.salesRecords.reduce((sum, r) => sum + r.salesAmountExclTax, 0);
            const cost = p.salesRecords.reduce((sum, r) => sum + r.costAmountExclTax, 0);
            const grossProfit = p.salesRecords.reduce((sum, r) => sum + r.grossProfit, 0);

            const costRate = sales > 0 ? (cost / sales) * 100 : 0;
            const grossProfitRate = sales > 0 ? (grossProfit / sales) * 100 : 0;

            return {
                productCode: p.productCode,
                productName: p.productName,
                sales,
                cost,
                grossProfit,
                costRate,
                grossProfitRate,
            };
        });

        // Filter out products with 0 sales if needed? Spec says "Sort defaults to sales desc".
        // "売上が 0 の商品を除外" -> Spec 6.3 Filter: "売上が 0 の商品を除外" (Exclude products with 0 sales) is an option.
        // I'll return all and let frontend filter, OR param.
        // For now returning all is safer for "No data" indication.

        return NextResponse.json(productPlData);
    } catch (error) {
        console.error('Failed to fetch Product PL data:', error);
        return NextResponse.json({ error: 'Failed to fetch Product PL data' }, { status: 500 });
    }
}
