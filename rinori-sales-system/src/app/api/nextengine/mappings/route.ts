
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/nextengine/mappings
 * 現在のマッピングを取得
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const mappings = await prisma.nEShopMapping.findMany({
            include: {
                channel: true
            }
        });

        return NextResponse.json({ mappings });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
    }
}

/**
 * POST /api/nextengine/mappings
 * マッピングを保存・更新
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { neShopId, channelId } = await request.json();

        if (!neShopId || !channelId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const mapping = await prisma.nEShopMapping.upsert({
            where: { neShopId: parseInt(neShopId) },
            update: { channelId: parseInt(channelId) },
            create: {
                neShopId: parseInt(neShopId),
                channelId: parseInt(channelId)
            }
        });

        return NextResponse.json({ success: true, mapping });
    } catch (error) {
        console.error('[NE Mapping] Save error:', error);
        return NextResponse.json({ error: 'Failed to save mapping' }, { status: 500 });
    }
}
