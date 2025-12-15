
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET: List all categories (or only active ones based on query param)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    try {
        const categories = await prisma.adCategory.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: { id: 'asc' }
        });
        return NextResponse.json(categories);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}

// POST: Create new category
export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { categoryName } = await request.json();
        if (!categoryName) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        const category = await prisma.adCategory.create({
            data: { categoryName, isActive: true }
        });

        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
    }
}

// PUT: Update category name
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, categoryName } = await request.json();
        if (!id || !categoryName) {
            return NextResponse.json({ error: 'ID and Category name are required' }, { status: 400 });
        }

        const category = await prisma.adCategory.update({
            where: { id: Number(id) },
            data: { categoryName }
        });

        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
    }
}

// PATCH: Toggle isActive status
export async function PATCH(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, isActive } = await request.json();
        if (!id || typeof isActive !== 'boolean') {
            return NextResponse.json({ error: 'ID and isActive are required' }, { status: 400 });
        }

        const category = await prisma.adCategory.update({
            where: { id: Number(id) },
            data: { isActive }
        });

        return NextResponse.json(category);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to toggle category status' }, { status: 500 });
    }
}
