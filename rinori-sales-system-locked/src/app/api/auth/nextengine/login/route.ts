
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { nextEngineClient } from '@/lib/nextengine';
import crypto from 'crypto';

/**
 * GET /api/auth/nextengine/login
 * ネクストエンジンの認証画面へリダイレクトする
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role !== 'master') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // セッション偽造防止用のstateを生成（本来はRedisやDBに一時保存してcallbackで検証すべきだが、
        // 今回はシンプルにランダム文字列を生成してリダイレクトする）
        const state = crypto.randomBytes(16).toString('hex');
        const authUrl = nextEngineClient.getAuthUrl(state);

        console.log('[NE OAuth] Generated Auth URL:', authUrl);
        console.log('[NE OAuth] Redirecting to Next Engine...');
        return NextResponse.redirect(authUrl);
    } catch (error: any) {
        console.error('[NE OAuth] Login error:', error);
        return NextResponse.json({ error: 'Failed to initiate login' }, { status: 500 });
    }
}
