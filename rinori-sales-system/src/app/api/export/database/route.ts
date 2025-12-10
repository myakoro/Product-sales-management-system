import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    try {
        // セッションチェック
        const session = await getServerSession(authOptions);

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'ログインが必要です' },
                { status: 401 }
            );
        }

        // マスター権限チェック
        if ((session.user as any).role !== 'master') {
            return NextResponse.json(
                { error: 'マスター権限が必要です' },
                { status: 403 }
            );
        }

        // データベースファイルのパスを取得
        const dbUrl = process.env.RUNTIME_DATABASE_URL || process.env.DATABASE_URL || '';

        // file:// プロトコルを削除してファイルパスを取得
        const dbPath = dbUrl.replace('file:', '');

        // ファイルの存在確認
        if (!fs.existsSync(dbPath)) {
            return NextResponse.json(
                { error: 'データベースファイルが見つかりません' },
                { status: 404 }
            );
        }

        // ファイルを読み込み
        const fileBuffer = fs.readFileSync(dbPath);

        // ファイル名を生成（日付付き）
        const date = new Date().toISOString().split('T')[0];
        const filename = `rinori-sales-backup-${date}.db`;

        // レスポンスヘッダーを設定してファイルをダウンロード
        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/x-sqlite3',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': fileBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Database export error:', error);
        return NextResponse.json(
            { error: 'データベースのエクスポートに失敗しました' },
            { status: 500 }
        );
    }
}
