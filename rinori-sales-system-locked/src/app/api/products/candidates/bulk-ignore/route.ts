import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { candidateIds } = body;

        if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
            return NextResponse.json({ error: '候補が選択されていません' }, { status: 400 });
        }

        console.log(`[一括無視] 処理開始: ${candidateIds.length}件`);

        const result = await prisma.newProductCandidate.updateMany({
            where: {
                id: { in: candidateIds },
                status: 'pending'
            },
            data: {
                status: 'ignored'
            }
        });

        console.log(`[一括無視] 処理完了: ${result.count}件`);

        return NextResponse.json({
            success: true,
            count: result.count
        });

    } catch (error: any) {
        console.error('[一括無視] エラー:', error);
        return NextResponse.json(
            { error: '一括無視に失敗しました: ' + error.message },
            { status: 500 }
        );
    }
}
