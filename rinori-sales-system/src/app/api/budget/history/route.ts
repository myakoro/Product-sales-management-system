
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const productCode = searchParams.get('productCode');
    const startYm = searchParams.get('startYm');
    const endYm = searchParams.get('endYm');

    if (!productCode || !startYm || !endYm) {
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
        // Find the period budget first
        const periodBudget = await prisma.periodBudget.findFirst({
            where: {
                productCode,
                startYm,
                endYm,
            },
        });

        if (!periodBudget) {
            return NextResponse.json([]);
        }

        const histories = await prisma.periodBudgetHistory.findMany({
            where: {
                periodBudgetId: periodBudget.id,
            },
            orderBy: {
                savedAt: 'desc',
            },
        });

        return NextResponse.json(histories);
    } catch (error) {
        console.error('Failed to fetch budget history:', error);
        return NextResponse.json({ error: 'Failed to fetch budget history' }, { status: 500 });
    }
}
