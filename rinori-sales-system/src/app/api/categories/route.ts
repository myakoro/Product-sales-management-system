import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/categories - カテゴリー一覧取得
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';

        const categories = await prisma.productCategory.findMany({
            where: includeInactive ? {} : { isActive: true },
            orderBy: { displayOrder: 'asc' },
            include: {
                _count: {
                    select: { products: true }
                }
            }
        });

        const result = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            displayOrder: cat.displayOrder,
            isActive: cat.isActive,
            productCount: cat._count.products
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json(
            { error: 'カテゴリー一覧の取得に失敗しました' },
            { status: 500 }
        );
    }
}

// POST /api/categories - カテゴリー作成
export async function POST(request: NextRequest) {
    try {
        // 権限チェック（マスター権限のみ）
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any)?.role !== 'master') {
            return NextResponse.json(
                { error: '権限がありません' },
                { status: 403 }
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

        // 重複チェック
        const existing = await prisma.productCategory.findFirst({
            where: { name: name.trim() }
        });

        if (existing) {
            return NextResponse.json(
                { error: '同名のカテゴリーが既に存在します' },
                { status: 400 }
            );
        }

        const category = await prisma.productCategory.create({
            data: {
                name: name.trim(),
                displayOrder: displayOrder ?? 0,
                isActive: isActive ?? true
            }
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json(
            { error: 'カテゴリーの作成に失敗しました' },
            { status: 500 }
        );
    }
}
