import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();
        const { salesChannelId } = body;

        if (!salesChannelId || typeof salesChannelId !== 'number') {
            return NextResponse.json({ error: '販路IDが必要です' }, { status: 400 });
        }

        const salesChannel = await prisma.salesChannel.findUnique({
            where: { id: salesChannelId }
        });

        if (!salesChannel) {
            return NextResponse.json({ error: '指定された販路が存在しません' }, { status: 400 });
        }

        const history = await prisma.importHistory.findUnique({
            where: { id },
            select: { id: true }
        });

        if (!history) {
            return NextResponse.json({ error: '取込履歴が見つかりません' }, { status: 404 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const updateResult = await tx.salesRecord.updateMany({
                where: { importHistoryId: id },
                data: { salesChannelId: salesChannelId }
            });

            await tx.importHistory.update({
                where: { id },
                data: { salesChannelId: salesChannelId }
            });

            return updateResult.count;
        });

        return NextResponse.json({ success: true, updatedCount: result });
    } catch (error) {
        console.error('Failed to update sales channel:', error);
        return NextResponse.json({ error: 'Failed to update sales channel' }, { status: 500 });
    }
}
