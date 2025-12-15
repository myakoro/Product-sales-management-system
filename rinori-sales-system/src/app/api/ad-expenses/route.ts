
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM

    if (!month) {
        return NextResponse.json({ error: 'Missing month parameter' }, { status: 400 });
    }

    try {
        const startDate = new Date(`${month}-01`);
        let [year, m] = month.split('-').map(Number);
        if (m === 12) { year++; m = 1; } else { m++; }
        const endDate = new Date(`${year}-${String(m).padStart(2, '0')}-01`);

        const expenses = await prisma.adExpense.findMany({
            where: {
                expenseDate: {
                    gte: startDate,
                    lt: endDate,
                }
            },
            include: {
                adCategory: true,
                createdBy: { select: { username: true } },
            },
            orderBy: { expenseDate: 'desc' }
        });

        return NextResponse.json(expenses);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = Number((session.user as any).id);

    try {
        const body = await request.json();
        const { date, amount, categoryId, memo } = body;

        const expense = await prisma.adExpense.create({
            data: {
                expenseDate: new Date(date),
                amount: Number(amount),
                adCategoryId: Number(categoryId),
                memo,
                createdByUserId: userId,
            },
            include: {
                adCategory: true,
                createdBy: { select: { username: true } },
            }
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
    }
}
