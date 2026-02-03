
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

        if (!neShopId && neShopId !== 0) {
            console.error('[NE Mapping] Missing neShopId');
            return NextResponse.json({ error: 'Missing neShopId' }, { status: 400 });
        }

        const targetShopId = parseInt(neShopId);
        const targetChannelId = channelId ? parseInt(channelId) : 0; // null/undefined/"" -> 0

        if (isNaN(targetShopId)) {
            console.error('[NE Mapping] Invalid neShopId:', neShopId);
            return NextResponse.json({ error: 'Invalid neShopId' }, { status: 400 });
        }

        // channelIdが0の場合はマッピングを削除（設定解除）
        if (targetChannelId === 0) {
            try {
                await prisma.nEShopMapping.deleteMany({
                    where: { neShopId: targetShopId }
                });
                return NextResponse.json({ success: true, message: 'Mapping cleared' });
            } catch (delError) {
                console.error('[NE Mapping] Delete error:', delError);
                throw delError;
            }
        }

        const mapping = await prisma.nEShopMapping.upsert({
            where: { neShopId: targetShopId },
            update: { channelId: targetChannelId },
            create: {
                neShopId: targetShopId,
                channelId: targetChannelId
            }
        });

        return NextResponse.json({ success: true, mapping });
    } catch (error) {
        console.error('[NE Mapping] Save error:', error);
        return NextResponse.json({ error: 'Failed to save mapping: ' + (error as any).message }, { status: 500 });
    }
}
