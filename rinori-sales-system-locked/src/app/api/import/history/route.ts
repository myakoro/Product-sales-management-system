
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const histories = await prisma.importHistory.findMany({
            orderBy: { importedAt: 'desc' },
            take: 100, // Limit to latest 100
            include: {
                importedBy: {
                    select: { username: true }
                },
                salesChannel: { // V1.4
                    select: { id: true, name: true }
                }
            }
        });
        return NextResponse.json(histories);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch import histories' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { id, salesChannelId } = body;

        if (!id || !salesChannelId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Transaction to update history AND all related sales records
        await prisma.$transaction(async (tx: any) => {
            // 1. Update ImportHistory
            await tx.importHistory.update({
                where: { id },
                data: { salesChannelId }
            });

            // 2. Update SalesRecords linked to this history
            await tx.salesRecord.updateMany({
                where: { importHistoryId: id },
                data: { salesChannelId }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update import history' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        const historyId = Number(id);

        // Transaction to delete SalesRecords AND ImportHistory
        await prisma.$transaction(async (tx: any) => {
            // 1. Delete SalesRecords
            await tx.salesRecord.deleteMany({
                where: { importHistoryId: historyId }
            });

            // 2. Delete ImportHistory (Logical delete or physical? Spec says user can choose. 
            // V1.4 logic: "Delete sales records" is the main goal. 
            // Spec: "Physical delete OR logical delete". Let's do physical delete for cleanup.)
            await tx.importHistory.delete({
                where: { id: historyId }
            });
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete import history' }, { status: 500 });
    }
}
