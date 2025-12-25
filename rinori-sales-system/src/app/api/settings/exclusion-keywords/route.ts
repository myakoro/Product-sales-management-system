
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 取得
export async function GET() {
    try {
        const keywords = await prisma.exclusionKeyword.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return NextResponse.json(keywords);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
    }
}

// 登録
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { keyword, matchType } = body;

        if (!keyword) {
            return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
        }

        const newKeyword = await prisma.exclusionKeyword.create({
            data: {
                keyword,
                matchType: matchType || 'startsWith'
            }
        });

        return NextResponse.json(newKeyword);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create keyword' }, { status: 500 });
    }
}
