import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/categories/:id/products - 商品を一括紐付け
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 権限チェック（マスター権限のみ）
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'master') {
            return NextResponse.json(
                { error: '権限がありません' },
                { status: 403 }
            );
        }

        const categoryId = parseInt(params.id);
        if (isNaN(categoryId)) {
            return NextResponse.json(
                { error: '無効なカテゴリーIDです' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { productIds } = body;

        if (!Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json(
                { error: '商品IDの配列が必要です' },
                { status: 400 }
            );
        }

        // カテゴリーの存在確認
        const category = await prisma.productCategory.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return NextResponse.json(
                { error: 'カテゴリーが見つかりません' },
                { status: 404 }
            );
        }

        // 商品のカテゴリーを一括更新
        const result = await prisma.product.updateMany({
            where: {
                productCode: { in: productIds }
            },
            data: {
                categoryId
            }
        });

        return NextResponse.json({
            message: `${result.count}件の商品をカテゴリーに追加しました`,
            categoryId,
            addedProductIds: productIds
        });
    } catch (error: any) {
        console.error('Error adding products to category:', error);
        return NextResponse.json(
            { error: `商品の追加に失敗しました: ${error.message}` },
            { status: 500 }
        );
    }
}

// DELETE /api/categories/:id/products - 商品を一括削除（未分類に移行）
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 権限チェック（マスター権限のみ）
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'master') {
            return NextResponse.json(
                { error: '権限がありません' },
                { status: 403 }
            );
        }

        const categoryId = parseInt(params.id);
        if (isNaN(categoryId)) {
            return NextResponse.json(
                { error: '無効なカテゴリーIDです' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { productIds } = body;

        if (!Array.isArray(productIds) || productIds.length === 0) {
            return NextResponse.json(
                { error: '商品IDの配列が必要です' },
                { status: 400 }
            );
        }

        // 商品のカテゴリーをNULLに設定
        const result = await prisma.product.updateMany({
            where: {
                productCode: { in: productIds },
                categoryId
            },
            data: {
                categoryId: null
            }
        });

        return NextResponse.json({
            message: `${result.count}件の商品をカテゴリーから削除しました`,
            removedProductIds: productIds
        });
    } catch (error: any) {
        console.error('Error removing products from category:', error);
        return NextResponse.json(
            { error: `商品の削除に失敗しました: ${error.message}` },
            { status: 500 }
        );
    }
}
