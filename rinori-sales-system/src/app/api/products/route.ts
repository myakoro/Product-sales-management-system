
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 商品一覧取得 (検索・フィルタ対応)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || 'all'; // '自社' | '仕入' | 'all'
    const status = searchParams.get('status') || 'all'; // '管理中' | '管理外' | 'all'
    const categoryId = searchParams.get('categoryId'); // V1.55追加: カテゴリーID

    // クエリ条件の構築
    const whereClause: any = {};

    if (search) {
        whereClause.OR = [
            { productCode: { contains: search } },
            { productName: { contains: search } },
            { asin: { contains: search } }, // V1.51追加
        ];
    }

    if (type !== 'all') {
        whereClause.productType = type;
    }

    if (status !== 'all') {
        whereClause.managementStatus = status;
    }

    // V1.55追加: カテゴリーフィルタ
    if (categoryId !== null) {
        if (categoryId === 'null') {
            // 未所属商品のみ
            whereClause.categoryId = null;
        } else if (categoryId) {
            // 特定カテゴリーの商品のみ
            whereClause.categoryId = parseInt(categoryId);
        }
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

        // V1.55: レスポンス形式を調整（categoryNameを追加）
        const result = products.map(p => ({
            id: p.productCode,
            productCode: p.productCode,
            productName: p.productName,
            salesPriceExclTax: p.salesPriceExclTax,
            costExclTax: p.costExclTax,
            productType: p.productType,
            managementStatus: p.managementStatus,
            categoryId: p.categoryId,
            categoryName: p.category?.name || null,
            asin: p.asin,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt
        }));

        return NextResponse.json(result);
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
            categoryId,
            asin // V1.51追加
        } = body;

        // バリデーション
        if (!productCode || !productName) {
            return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 });
        }

        // 重複チェック (商品コード)
        const existing = await prisma.product.findUnique({
            where: { productCode },
        });
        if (existing) {
            return NextResponse.json({ error: 'この商品コードは既に使用されています' }, { status: 400 });
        }

        // ASIN重複チェック
        if (asin) {
            const existingAsin = await (prisma.product as any).findFirst({
                where: { asin: asin }
            });
            if (existingAsin) {
                return NextResponse.json({ error: 'このASINは既に他の商品に登録されています' }, { status: 400 });
            }
        }

        const product = await (prisma.product as any).create({
            data: {
                productCode,
                productName,
                salesPriceExclTax: Number(salesPriceExclTax),
                costExclTax: Number(costExclTax),
                productType, // '自社' or '仕入'
                managementStatus, // '管理中' or '管理外'
                categoryId: categoryId ? Number(categoryId) : null,
                asin: asin || null, // V1.51追加
            },
        });

        // 新商品候補テーブルに同じ商品コードで pending のものがあれば、登録済みに更新しておく
        try {
            await prisma.newProductCandidate.updateMany({
                where: {
                    productCode,
                    status: 'pending',
                },
                data: {
                    status: 'registered',
                },
            });
        } catch (updateError) {
            console.error('Failed to update newProductCandidate status for productCode', productCode, updateError);
            // 候補の更新に失敗しても商品登録自体は成功させる
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Failed to create product:', error);
        return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }
}
