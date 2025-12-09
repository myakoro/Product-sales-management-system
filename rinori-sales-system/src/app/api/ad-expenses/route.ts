
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startYm = searchParams.get('startYm'); // e.g., 2025-10
    const endYm = searchParams.get('endYm');     // e.g., 2025-10

    if (!startYm || !endYm) {
        return NextResponse.json({ error: 'Missing startYm or endYm' }, { status: 400 });
    }

    try {
        const startDate = new Date(`${startYm}-01`);

        // For end date logic: if endYm is 2025-10, we want < 2025-11-01
        const [year, month] = endYm.split('-').map(Number);
        // Date(year, monthIndex) where monthIndex 0-11.
        // We want the 1st day of the NEXT month of the endYm.
        // Date(2025, 10, 1) -> Nov 1st (since month is 0-indexed, 10 is Nov)
        const endDateLimit = new Date(year, month, 1);

        const expenses = await prisma.adExpense.findMany({
            where: {
                expenseDate: {
                    gte: startDate,
                    lt: endDateLimit,
                },
            },
            include: {
                adCategory: true,
            },
            orderBy: {
                expenseDate: 'asc',
            },
        });

        return NextResponse.json(expenses);
    } catch (error) {
        console.error('Failed to fetch ad expenses:', error);
        return NextResponse.json({ error: 'Failed to fetch ad expenses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { expenseDate, amount, adCategoryId, memo } = body;

        // Basic validation
        if (!expenseDate || amount === undefined || !adCategoryId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Usually we get user ID from session. For now, hardcoding or using a dummy user ID if available, or nullable.
        // Schema says: createdByUserId Int
        // I need a user ID. I'll query for a user or create one if none exist?
        // Or just pick the first user.
        // For this prototype, let's assume user ID 1 exists or use a dummy.
        // Wait, I should not assume.
        // Let's check schema: User table exists.
        // I'll try to find a user, if not, create a default "system" user.

        let user = await prisma.user.findFirst();
        if (!user) {
            // Create a default user if none exists (for dev)
            user = await prisma.user.create({
                data: {
                    username: 'admin',
                    passwordHash: 'dummy', // In real app, hash this
                    role: 'master'
                }
            });
        }

        const expense = await prisma.adExpense.create({
            data: {
                expenseDate: new Date(expenseDate),
                amount: Number(amount),
                adCategoryId: Number(adCategoryId),
                memo,
                createdByUserId: user.id
            },
            include: {
                adCategory: true
            }
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error('Failed to create ad expense:', error);
        return NextResponse.json({ error: 'Failed to create ad expense' }, { status: 500 });
    }
}
