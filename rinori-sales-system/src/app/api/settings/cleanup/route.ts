
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || (session.user as any).role !== 'master') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { targetYm } = body;

        if (!targetYm || !/^\d{4}-\d{2}$/.test(targetYm)) {
            return NextResponse.json({ error: 'Invalid target month format (YYYY-MM)' }, { status: 400 });
        }

        // Calculate date range for the month
        const [year, month] = targetYm.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1); // First day of next month

        // Transaction to delete sales records and update history if needed?
        // Actually, if we delete records, the history might become empty or invalid.
        // But the goal is to clean up "orphan" data or force delete.
        // We will just delete SalesRecords matching the date range.

        // Also verify if there are import histories for this month?
        // If we delete records, we should probably also update related ImportHistory recordCount or delete them?
        // Keeping it simple: Just delete SalesRecords.
        // Or should we delete by periodYm string field? 
        // SalesRecord has `periodYm` field. Let's use that for consistency with Import logic.

        const deleteResult = await prisma.salesRecord.deleteMany({
            where: {
                periodYm: targetYm
            }
        });

        // Also check if there are any ImportHistory for this targetYm and mark them? 
        // Or leave them? If records are gone, history remains but recordCount might be misleading.
        // Let's just return the count deleted.

        return NextResponse.json({
            success: true,
            deletedCount: deleteResult.count,
            message: `${targetYm}の売上データ ${deleteResult.count}件を削除しました`
        });

    } catch (error) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Failed to cleanup data' }, { status: 500 });
    }
}
