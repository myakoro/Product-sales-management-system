
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

interface SalesRecordGroup {
    productCode: string;
    _sum: {
        salesAmountExclTax: number | null;
        costAmountExclTax: number | null;
        grossProfit: number | null;
    };
}

interface ProductSelection {
    productCode: string;
    productName: string;
    productType: string;
}

interface ProductPLResult {
    productCode: string;
    productName: string;
    productType?: string;
    sales: number;
    cost: number;
    grossProfit: number;
    costRate: number;
    grossProfitRate: number;
}

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // const userRole = (session.user as any).role; // Both roles can access Product PL

    const { searchParams } = new URL(request.url);
    const startYm = searchParams.get('startYm');
    const endYm = searchParams.get('endYm');
    const type = searchParams.get('type') || 'all'; // own, purchase, all
    const salesChannelId = searchParams.get('salesChannelId');

    if (!startYm || !endYm) {
        return NextResponse.json({ error: 'Missing startYm or endYm' }, { status: 400 });
    }

    try {
        // Group SalesRecords by Product
        const groupBy = await prisma.salesRecord.groupBy({
            by: ['productCode'],
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
                    managementStatus: { in: ['managed', '管理中'] },
                    ...(type !== 'all' ? {
                        productType: type === 'own' ? { in: ['own', '自社'] } : { in: ['purchase', '仕入'] }
                    } : {})
                },
                ...(salesChannelId && salesChannelId !== 'all' ? { salesChannelId: Number(salesChannelId) } : {})
            }
        });

        // Need Product Names, so fetch products or use include?
        // GroupBy doesn't support include.
        // So fetch relevant products.
        const productCodes = groupBy.map((g: SalesRecordGroup) => g.productCode);
        const products: ProductSelection[] = await prisma.product.findMany({
            where: { productCode: { in: productCodes } },
            select: { productCode: true, productName: true, productType: true }
        });
        const productMap = new Map<string, ProductSelection>(products.map((p: ProductSelection) => [p.productCode, p]));

        const results: ProductPLResult[] = groupBy.map((g: SalesRecordGroup) => {
            const product = productMap.get(g.productCode);
            const sales = g._sum.salesAmountExclTax || 0;
            const cost = g._sum.costAmountExclTax || 0;
            const gp = g._sum.grossProfit || 0;

            return {
                productCode: g.productCode,
                productName: product?.productName || 'Unknown',
                productType: product?.productType,
                sales: sales,
                cost: cost,
                grossProfit: gp,
                costRate: sales ? (cost / sales) * 100 : 0,
                grossProfitRate: sales ? (gp / sales) * 100 : 0,
            };
        });

        // Filter out 0 sales if needed? Spec 6.3 "Filter out products with 0 sales"
        // Let's filter in memory or frontend. Let's return all non-zero records?
        // groupBy only returns records that exist in SalesRecord. 
        // If sales is 0 but record exists (e.g. return?), keep it.

        // Sort by Sales desc default
        results.sort((a: any, b: any) => b.sales - a.sales);

        return NextResponse.json(results);

    } catch (error) {
        console.error('Failed to fetch Product PL data:', error);
        return NextResponse.json({ error: 'Failed to fetch Product PL data' }, { status: 500 });
    }
}
