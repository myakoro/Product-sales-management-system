
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: 商品詳細取得
export async function GET(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        const product = await prisma.product.findUnique({
            where: { productCode: params.code },
            include: { category: true },
        });

        if (!product) {
            return NextResponse.json({ error: '商品が見つかりません' }, { status: 404 });
        }

        return NextResponse.json(product);
    } catch (error) {
        console.error('Failed to fetch product:', error);
        return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
    }
}

// PUT: 商品更新
export async function PUT(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        const body = await request.json();
        const {
            productName,
            salesPriceExclTax,
            costExclTax,
            productType,
            managementStatus,
            categoryId
        } = body;

        const product = await prisma.product.update({
            where: { productCode: params.code },
            data: {
                productName,
                salesPriceExclTax: salesPriceExclTax !== undefined ? Number(salesPriceExclTax) : undefined,
                costExclTax: costExclTax !== undefined ? Number(costExclTax) : undefined,
                productType,
                managementStatus,
                categoryId: categoryId ? Number(categoryId) : null,
            },
        });

        return NextResponse.json(product);
    } catch (error) {
        console.error('Failed to update product:', error);
        return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }
}

// DELETE: 商品削除
export async function DELETE(
    request: Request,
    { params }: { params: { code: string } }
) {
    try {
        // 関連データのチェック（売上履歴などがある場合は削除できないようにする等のロジックが必要だが、仕様次第）
        // 今回は単純削除とするが、通常は論理削除やチェックを入れる

        // 売上履歴があるか確認
        const hasSales = await prisma.salesRecord.findFirst({
            where: { productCode: params.code }
        });

        if (hasSales) {
            return NextResponse.json({ error: '売上履歴が存在するため削除できません' }, { status: 400 });
        }

        await prisma.product.delete({
            where: { productCode: params.code },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete product:', error);
        return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }
}
