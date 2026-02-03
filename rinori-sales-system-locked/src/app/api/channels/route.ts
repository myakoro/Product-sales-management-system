
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/channels
 * 販路一覧を取得する
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const channels = await prisma.salesChannel.findMany({
            where: { isActive: true },
            select: {
                id: true,
                name: true
            },
            orderBy: { id: 'asc' }
        });

        return NextResponse.json(channels);
    } catch (error: any) {
        console.error('[Channels API] Error:', error);
        return NextResponse.json({ error: 'Failed to fetch channels' }, { status: 500 });
    }
}
