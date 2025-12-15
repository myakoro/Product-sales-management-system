
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const channels = await prisma.salesChannel.findMany({
            orderBy: { id: 'asc' }
        });
        return NextResponse.json(channels);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch sales channels' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const channel = await prisma.salesChannel.create({
            data: {
                name,
                isActive: true
            }
        });

        return NextResponse.json(channel);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create sales channel' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, name, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const channel = await prisma.salesChannel.update({
            where: { id: Number(id) },
            data: {
                name,
                isActive
            }
        });

        return NextResponse.json(channel);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update sales channel' }, { status: 500 });
    }
}
