
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/auth/nextengine/status
 * ネクストエンジンの接続状態を確認する
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const auth = await prisma.nEAuth.findFirst({
            where: { id: 1 }
        });

        if (!auth) {
            return NextResponse.json({ connected: false });
        }

        // 現在時刻がアクセストークンの期限内か、あるいはリフレッシュ可能か
        const now = new Date();
        const connected = auth.refreshesAt > now; // リフレッシュトークンが有効なら接続中とみなす

        return NextResponse.json({
            connected,
            expiresAt: auth.expiresAt,
            refreshesAt: auth.refreshesAt,
            updatedAt: auth.updatedAt
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch status' }, { status: 500 });
    }
}
