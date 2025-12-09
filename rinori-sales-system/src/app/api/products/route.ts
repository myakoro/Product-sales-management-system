
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 商品一覧取得 (検索・フィルタ対応)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all'; // '自社' | '仕入' | 'all'
    const status = searchParams.get('status') || 'all'; // '管理中' | '管理外' | 'all'

    // クエリ条件の構築
    const whereClause: any = {};

    if (search) {
        whereClause.OR = [
            { productCode: { contains: search } },
            { productName: { contains: search } },
        ];
    }

    if (type !== 'all') {
        whereClause.productType = type;
    }

    if (status !== 'all') {
        whereClause.managementStatus = status;
    }

    try {
        const products = await prisma.product.findMany({
            where: whereClause,
            orderBy: {
                productCode: 'asc',
            },
            include: {
                category: true, // カテゴリ情報も含める
            },
        });
        return NextResponse.json(products);
    } catch (error) {
        console.error('Failed to fetch products:', error);
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }
}

// POST: 商品新規登録
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            productCode,
            productName,
            salesPriceExclTax,
            costExclTax,
            productType,
            managementStatus,
            categoryId
        } = body;

        // バリデーション
        if (!productCode || !productName) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        // 重複チェック
        const existing = await prisma.product.findUnique({
            where: { productCode },
        });
        if (existing) {
            return NextResponse.json({ error: 'この商品コードは既に使用されています' }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                productCode,
                productName,
                salesPriceExclTax: Number(salesPriceExclTax),
                costExclTax: Number(costExclTax),
                productType, // '自社' or '仕入'
                managementStatus, // '管理中' or '管理外'
                categoryId: categoryId ? Number(categoryId) : null,
            },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error('Failed to create product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
