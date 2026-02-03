
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/ad-budgets?periodYm=YYYY-MM
 * 指定された月の各カテゴリの予算一覧を取得
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const periodYm = searchParams.get('periodYm');

    if (!periodYm) {
        return NextResponse.json({ error: 'Missing periodYm parameter' }, { status: 400 });
    }

    try {
        const budgets = await prisma.adBudget.findMany({
            where: { periodYm },
            include: {
                adCategory: true,
            },
        });

        return NextResponse.json(budgets);
    } catch (error) {
        console.error('Failed to fetch ad budgets:', error);
        return NextResponse.json({ error: 'Failed to fetch ad budgets' }, { status: 500 });
    }
}

/**
 * POST /api/ad-budgets
 * 複数カテゴリの予算を一括保存 (upsert)
 * Request Body: { periodYm, budgets: [{ categoryId, amount }, ...] }
 */
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // マスター権限チェック
    if ((session.user as any).role !== 'master') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = Number((session.user as any).id);

    try {
        const body = await request.json();
        const { periodYm, budgets } = body;

        if (!periodYm || !Array.isArray(budgets)) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        // トランザクションで一括処理
        const results = await prisma.$transaction(
            budgets.map((b: { categoryId: number; amount: number }) =>
                prisma.adBudget.upsert({
                    where: {
                        periodYm_adCategoryId: {
                            periodYm,
                            adCategoryId: b.categoryId,
                        },
                    },
                    update: {
                        amount: b.amount,
                        createdByUserId: userId,
                    },
                    create: {
                        periodYm,
                        adCategoryId: b.categoryId,
                        amount: b.amount,
                        createdByUserId: userId,
                    },
                })
            )
        );

        return NextResponse.json(results);
    } catch (error) {
        console.error('Failed to upsert ad budgets:', error);
        return NextResponse.json({ error: 'Failed to save budgets' }, { status: 500 });
    }
}
