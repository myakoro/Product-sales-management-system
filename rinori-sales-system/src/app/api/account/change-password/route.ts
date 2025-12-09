import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { currentPassword, newPassword } = body as {
            currentPassword?: string;
            newPassword?: string;
        };

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: '現在のパスワードと新しいパスワードを入力してください。' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: '新しいパスワードは8文字以上で入力してください。' }, { status: 400 });
        }

        const username = (session.user as any).name as string | undefined;
        if (!username) {
            return NextResponse.json({ error: 'ユーザー情報を取得できませんでした。' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return NextResponse.json({ error: 'ユーザーが存在しません。' }, { status: 404 });
        }

        const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json({ error: '現在のパスワードが正しくありません。' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: hashed },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error changing password:', error);
        return NextResponse.json({ error: 'パスワードの変更に失敗しました。' }, { status: 500 });
    }
}
