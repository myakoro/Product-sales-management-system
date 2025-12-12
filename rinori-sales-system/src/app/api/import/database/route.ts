import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

function resolveDbPathFromUrl(dbUrl: string): string {
    let raw = dbUrl.replace(/^file:/, '');
    if (raw.startsWith('//')) raw = raw.slice(2);

    if (raw.match(/^\/[A-Za-z]:\//)) {
        raw = raw.slice(1);
    }

    const normalized = path.normalize(raw);
    return path.isAbsolute(normalized) ? normalized : path.resolve(process.cwd(), normalized);
}

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
        }

        if ((session.user as any).role !== 'master') {
            return NextResponse.json({ error: 'マスター権限が必要です' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
        }

        const dbUrl = process.env.RUNTIME_DATABASE_URL || process.env.DATABASE_URL || '';
        if (!dbUrl || !dbUrl.startsWith('file:')) {
            return NextResponse.json({ error: 'この環境ではDB復元を実行できません（SQLite file: URLが必要です）' }, { status: 400 });
        }

        const dbPath = resolveDbPathFromUrl(dbUrl);
        const dbDir = path.dirname(dbPath);
        const base = path.basename(dbPath, path.extname(dbPath));

        if (!fs.existsSync(dbDir)) {
            return NextResponse.json({ error: 'DB保存先ディレクトリが存在しません' }, { status: 500 });
        }

        if (!fs.existsSync(dbPath)) {
            return NextResponse.json({ error: '既存のDBファイルが見つかりません' }, { status: 404 });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(dbDir, `${base}-backup-${timestamp}.db`);
        fs.copyFileSync(dbPath, backupPath);

        const buffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(dbPath, buffer);

        return NextResponse.json({
            success: true,
            backupFilename: path.basename(backupPath),
            message: 'DBを復元しました。反映されない場合はサービスの再起動/再デプロイを行ってください。'
        });
    } catch (error: any) {
        console.error('Database import error:', error);
        return NextResponse.json({ error: 'データベースの復元に失敗しました' }, { status: 500 });
    }
}
