import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const activeOnly = searchParams.get('activeOnly') === 'true';

        const salesChannels = await prisma.salesChannel.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: {
                id: 'asc',
            },
        });
        return NextResponse.json(salesChannels);
    } catch (error) {
        console.error('Failed to fetch sales channels:', error);
        return NextResponse.json({ error: 'Failed to fetch sales channels' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: '販路名は必須です' }, { status: 400 });
        }

        const salesChannel = await prisma.salesChannel.create({
            data: {
                name,
                isActive: true,
            },
        });

        return NextResponse.json(salesChannel);
    } catch (error: any) {
        console.error('Failed to create sales channel:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'この販路名は既に存在します' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Failed to create sales channel' }, { status: 500 });
    }
}
