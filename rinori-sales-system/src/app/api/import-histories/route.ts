import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const fromYm = searchParams.get('fromYm');
        const toYm = searchParams.get('toYm');
        const salesChannelIdStr = searchParams.get('salesChannelId');
        const keyword = searchParams.get('keyword');

        const salesChannelId = salesChannelIdStr ? parseInt(salesChannelIdStr, 10) : null;

        const where: any = {};

        if (fromYm || toYm) {
            where.targetYm = {};
            if (fromYm) where.targetYm.gte = fromYm;
            if (toYm) where.targetYm.lte = toYm;
        }

        if (salesChannelId && salesChannelId > 0) {
            where.salesChannelId = salesChannelId;
        }

        if (keyword) {
            where.OR = [
                { comment: { contains: keyword } },
            ];
        }

        const [histories, total] = await Promise.all([
            prisma.importHistory.findMany({
                where,
                include: {
                    importedBy: {
                        select: { id: true, username: true }
                    },
                    salesChannel: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { importedAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.importHistory.count({ where })
        ]);

        return NextResponse.json({
            data: histories,
            total,
            limit,
            offset
        });
    } catch (error) {
        console.error('Failed to fetch import histories:', error);
        return NextResponse.json({ error: 'Failed to fetch import histories' }, { status: 500 });
    }
}
