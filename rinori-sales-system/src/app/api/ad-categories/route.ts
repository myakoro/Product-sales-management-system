
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const categories = await prisma.adCategory.findMany({
            orderBy: {
                id: 'asc',
            },
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error('Failed to fetch ad categories:', error);
        return NextResponse.json({ error: 'Failed to fetch ad categories' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { categoryName } = body;

        if (!categoryName) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        const category = await prisma.adCategory.create({
            data: {
                categoryName,
            },
        });

        return NextResponse.json(category);
    } catch (error) {
        console.error('Failed to create ad category:', error);
        return NextResponse.json({ error: 'Failed to create ad category' }, { status: 500 });
    }
}
