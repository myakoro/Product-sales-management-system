import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/pl/category - カテゴリー別PL分析
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const targetYm = searchParams.get('targetYm');
        const sortBy = searchParams.get('sortBy') || 'sales';
        const sortOrder = searchParams.get('sortOrder') || 'desc';

        const salesChannelIdStr = searchParams.get('salesChannelId');
        const salesChannelId = (salesChannelIdStr && salesChannelIdStr !== 'all') ? parseInt(salesChannelIdStr, 10) : null;

        if (!targetYm) {
            return NextResponse.json(
                { error: '対象年月（targetYm）は必須です' },
                { status: 400 }
            );
        }

        // 売上実績を取得
        const salesRecords = await prisma.salesRecord.findMany({
            where: {
                periodYm: targetYm,
                ...(salesChannelId ? { salesChannelId: salesChannelId } : {})
            },
            include: {
                product: {
                    include: {
                        category: true
                    }
                }
            }
        });

        // カテゴリーごとに集計
        const categoryMap = new Map<number | null, {
            categoryId: number | null;
            categoryName: string;
            sales: number;
            cogs: number;
            grossProfit: number;
        }>();

        for (const record of salesRecords) {
            const categoryId = record.product.categoryId;
            const categoryName = record.product.category?.name || '未分類';

            if (!categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                    categoryId,
                    categoryName,
                    sales: 0,
                    cogs: 0,
                    grossProfit: 0
                });
            }

            const category = categoryMap.get(categoryId)!;
            category.sales += record.salesAmountExclTax;
            category.cogs += record.costAmountExclTax;
            category.grossProfit += record.grossProfit;
        }

        // 配列に変換し、粗利率を計算
        let result = Array.from(categoryMap.values()).map(cat => ({
            categoryId: cat.categoryId,
            categoryName: cat.categoryName,
            sales: Math.round(cat.sales),
            cogs: Math.round(cat.cogs),
            grossProfit: Math.round(cat.grossProfit),
            grossProfitRate: cat.sales > 0 ? Math.round((cat.grossProfit / cat.sales) * 1000) / 10 : 0
        }));

        // ソート
        result.sort((a, b) => {
            let aValue: number, bValue: number;

            switch (sortBy) {
                case 'grossProfit':
                    aValue = a.grossProfit;
                    bValue = b.grossProfit;
                    break;
                case 'grossProfitRate':
                    aValue = a.grossProfitRate;
                    bValue = b.grossProfitRate;
                    break;
                case 'sales':
                default:
                    aValue = a.sales;
                    bValue = b.sales;
                    break;
            }

            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching category PL:', error);
        return NextResponse.json(
            { error: 'カテゴリー別PL分析の取得に失敗しました' },
            { status: 500 }
        );
    }
}
