
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * GET /api/settings/nextengine/mapping
 * 現在のNE店舗マッピング一覧を取得
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const mappings = await prisma.nEShopMapping.findMany({
            include: { channel: true }
        });

        return NextResponse.json(mappings);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
    }
}

/**
 * POST /api/settings/nextengine/mapping
 * NE店舗マッピングを更新
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { neShopId, channelId } = await request.json();

        const mapping = await prisma.nEShopMapping.upsert({
            where: { neShopId },
            update: { channelId },
            create: { neShopId, channelId }
        });

        return NextResponse.json(mapping);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update mapping' }, { status: 500 });
    }
}

/**
 * DELETE /api/settings/nextengine/mapping/[id] は別途実装検討
 */
