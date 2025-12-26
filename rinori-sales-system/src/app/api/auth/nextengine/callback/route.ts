
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nextEngineClient } from '@/lib/nextengine';

/**
 * GET /api/auth/nextengine/callback
 * ネクストエンジンからのコールバックを受け取る
 * 
 * 仕様: 
 * 1. クエリパラメータから uid と state を取得
 * 2. ネクストエンジンAPIを実行してアクセストークン等を取得
 * 3. NEAuthテーブルに保存（既存レコードがあれば更新）
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const state = searchParams.get('state');

    console.log('[NE OAuth] Callback received:', { uid, state });

    if (!uid) {
        return NextResponse.json({ error: 'Missing uid' }, { status: 400 });
    }

    try {
        if (!state) {
            return NextResponse.json({ error: 'Missing state' }, { status: 400 });
        }

        // 実際にNE APIを叩いてアクセストークンを取得・DB保存
        await nextEngineClient.fetchTokens(uid, state);

        console.log('[NE OAuth] Successfully authenticated and tokens saved.');

        return NextResponse.redirect(new URL('/settings/nextengine?auth=success', request.url));
    } catch (error: any) {
        console.error('[NE OAuth] Callback error:', error);
        return NextResponse.redirect(new URL('/settings/nextengine?auth=error', request.url));
    }
}
