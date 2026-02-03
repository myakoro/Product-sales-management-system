import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();
        const { name, isActive } = body;

        const updateData: { name?: string; isActive?: boolean } = {};
        if (name !== undefined) updateData.name = name;
        if (isActive !== undefined) updateData.isActive = isActive;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: '更新する項目がありません' }, { status: 400 });
        }

        const salesChannel = await prisma.salesChannel.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(salesChannel);
    } catch (error: any) {
        console.error('Failed to update sales channel:', error);
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'この販路名は既に存在します' }, { status: 400 });
        }
        if (error.code === 'P2025') {
            return NextResponse.json({ error: '販路が見つかりません' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to update sales channel' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        const usageCount = await prisma.salesRecord.count({
            where: { salesChannelId: id },
        });

        if (usageCount > 0) {
            return NextResponse.json(
                { error: 'この販路は売上データで使用されているため削除できません。非表示にしてください。' },
                { status: 400 }
            );
        }

        const historyCount = await prisma.importHistory.count({
            where: { salesChannelId: id },
        });

        if (historyCount > 0) {
            return NextResponse.json(
                { error: 'この販路は取込履歴で使用されているため削除できません。非表示にしてください。' },
                { status: 400 }
            );
        }

        await prisma.salesChannel.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Failed to delete sales channel:', error);
        if (error.code === 'P2025') {
            return NextResponse.json({ error: '販路が見つかりません' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Failed to delete sales channel' }, { status: 500 });
    }
}
