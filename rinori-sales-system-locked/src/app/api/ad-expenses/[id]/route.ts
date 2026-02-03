
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();
        const { expenseDate, amount, adCategoryId, memo } = body;

        const expense = await prisma.adExpense.update({
            where: { id },
            data: {
                expenseDate: expenseDate ? new Date(expenseDate) : undefined,
                amount: amount !== undefined ? Number(amount) : undefined,
                adCategoryId: adCategoryId ? Number(adCategoryId) : undefined,
                memo,
            },
            include: {
                adCategory: true
            }
        });

        return NextResponse.json(expense);
    } catch (error) {
        console.error('Failed to update ad expense:', error);
        return NextResponse.json({ error: 'Failed to update ad expense' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        await prisma.adExpense.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete ad expense:', error);
        return NextResponse.json({ error: 'Failed to delete ad expense' }, { status: 500 });
    }
}
