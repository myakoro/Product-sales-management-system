import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: 管理売上予算の取得
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            console.log('[ManagementBudget API] Unauthorized access attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startYm = searchParams.get('startYm');
        const endYm = searchParams.get('endYm');

        console.log(`[ManagementBudget API] GET request: startYm=${startYm}, endYm=${endYm}`);

        if (!startYm || !endYm) {
            return NextResponse.json({ error: 'Missing startYm or endYm' }, { status: 400 });
        }

        const budgets = await prisma.managementBudget.findMany({
            where: {
                periodYm: {
                    gte: startYm,
                    lte: endYm,
                },
            },
            orderBy: {
                periodYm: 'asc',
            },
        });

        console.log(`[ManagementBudget API] Returning ${budgets.length} budgets. Sample:`, budgets[0]);

        return NextResponse.json(budgets);
    } catch (error) {
        console.error('[ManagementBudget API] GET error:', error);
        return NextResponse.json({ error: 'Failed to fetch management budgets' }, { status: 500 });
    }
}

// POST: 管理売上予算の保存（Upsert）
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'master') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { budgets } = body; // Array of { periodYm: string, amount: number }

        console.log(`[ManagementBudget API] POST request: saving ${budgets?.length} periods`);

        if (!Array.isArray(budgets)) {
            return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
        }

        // Upsert each budget
        const results = await Promise.all(
            budgets.map((budget: { periodYm: string; amount: number }) =>
                prisma.managementBudget.upsert({
                    where: { periodYm: budget.periodYm },
                    update: { amount: budget.amount },
                    create: {
                        periodYm: budget.periodYm,
                        amount: budget.amount,
                    },
                })
            )
        );

        return NextResponse.json({ success: true, count: results.length });
    } catch (error: any) {
        console.error('[Management Budget POST] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
