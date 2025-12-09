import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // 不完全マスタを検出
        const incompleteProducts = await prisma.product.findMany({
            where: {
                managementStatus: '管理中',
                OR: [
                    { salesPriceExclTax: 0 },
                    { costExclTax: 0 }
                ]
            },
            select: {
                productCode: true,
                productName: true,
                salesPriceExclTax: true,
                costExclTax: true
            },
            orderBy: {
                productCode: 'asc'
            }
        });

        return NextResponse.json({
            count: incompleteProducts.length,
            products: incompleteProducts
        });
    } catch (error: any) {
        console.error('不完全マスタ取得エラー:', error);
        return NextResponse.json(
            { error: '不完全マスタの取得に失敗しました' },
            { status: 500 }
        );
    }
}
