import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { status } = await request.json();
        const candidateId = parseInt(params.id, 10);

        if (!status || !['pending', 'registered', 'ignored'].includes(status)) {
            return NextResponse.json(
                { error: '無効なステータスです' },
                { status: 400 }
            );
        }

        const updated = await prisma.newProductCandidate.update({
            where: { id: candidateId },
            data: { status }
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error('候補更新エラー:', error);
        return NextResponse.json(
            { error: '候補の更新に失敗しました' },
            { status: 500 }
        );
    }
}
