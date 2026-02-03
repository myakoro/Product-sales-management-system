
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();
        const { categoryName } = body;

        if (!categoryName) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        const category = await prisma.adCategory.update({
            where: { id },
            data: { categoryName },
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error('Failed to update ad category:', error);
        return NextResponse.json({ error: 'Failed to update ad category' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        // Check if used
        const usageCount = await prisma.adExpense.count({
            where: { adCategoryId: id },
        });

        if (usageCount > 0) {
            return NextResponse.json(
                { error: 'Cannot delete category because it is used in expenses.' },
                { status: 400 }
            );
        }

        await prisma.adCategory.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete ad category:', error);
        return NextResponse.json({ error: 'Failed to delete ad category' }, { status: 500 });
    }
}
