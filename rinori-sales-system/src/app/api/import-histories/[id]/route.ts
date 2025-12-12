import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        const history = await prisma.importHistory.findUnique({
            where: { id },
            select: { id: true, recordCount: true }
        });

        if (!history) {
            return NextResponse.json({ error: '取込履歴が見つかりません' }, { status: 404 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.salesRecord.deleteMany({
                where: { importHistoryId: id }
            });
            await tx.importHistory.delete({
                where: { id }
            });
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete import history:', error);
        return NextResponse.json({ error: 'Failed to delete import history' }, { status: 500 });
    }
}
