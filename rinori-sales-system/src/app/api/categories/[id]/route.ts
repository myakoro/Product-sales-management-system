import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// PUT /api/categories/:id - カテゴリー更新
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 権限チェック（マスター権限のみ）
        const session = await getServerSession();
        if (!session || (session.user as any)?.role !== 'master') {
            return NextResponse.json(
                { error: '権限がありません' },
                { status: 403 }
            );
        }

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json(
                { error: '無効なIDです' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { name, displayOrder, isActive } = body;

        // バリデーション
        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'カテゴリー名は必須です' },
                { status: 400 }
            );
        }

        if (name.length > 50) {
            return NextResponse.json(
                { error: 'カテゴリー名は50文字以内で入力してください' },
                { status: 400 }
            );
        }

        // 重複チェック（自分以外）
        const existing = await prisma.productCategory.findFirst({
            where: {
                name: name.trim(),
                NOT: { id }
            }
        });

        if (existing) {
            return NextResponse.json(
                { error: '同名のカテゴリーが既に存在します' },
                { status: 400 }
            );
        }

        const category = await prisma.productCategory.update({
            where: { id },
            data: {
                name: name.trim(),
                displayOrder: displayOrder ?? 0,
                isActive: isActive ?? true
            }
        });

        return NextResponse.json(category);
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'カテゴリーが見つかりません' },
                { status: 404 }
            );
        }
        console.error('Error updating category:', error);
        return NextResponse.json(
            { error: 'カテゴリーの更新に失敗しました' },
            { status: 500 }
        );
    }
}

// DELETE /api/categories/:id - カテゴリー削除
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

        const id = parseInt(params.id);
        if (isNaN(id)) {
            return NextResponse.json(
                { error: '無効なIDです' },
                { status: 400 }
            );
        }

        // 所属商品を未分類に移行
        const affectedProducts = await prisma.product.updateMany({
            where: { categoryId: id },
            data: { categoryId: null }
        });

        // カテゴリーを削除
        await prisma.productCategory.delete({
            where: { id }
        });

        return NextResponse.json({
            message: 'カテゴリーを削除しました',
            affectedProducts: affectedProducts.count
        });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'カテゴリーが見つかりません' },
                { status: 404 }
            );
        }
        console.error('Error deleting category:', error);
        return NextResponse.json(
            { error: 'カテゴリーの削除に失敗しました' },
            { status: 500 }
        );
    }
}
