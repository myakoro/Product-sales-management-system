
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const candidates = await prisma.newProductCandidate.findMany({
            where: { status: 'pending' },
            orderBy: { detectedAt: 'desc' }
        });
        return NextResponse.json(candidates);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
    }
}

// 候補を登録（無視）したり、一括削除したり機能が必要か？
// 今回は「登録」は商品マスタの方で行うので、ここではステータス更新APIが必要かもしれないが、
// ひとまずリスト取得のみ。
