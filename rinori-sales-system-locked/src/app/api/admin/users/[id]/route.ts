import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role as string | undefined;

        if (!session || role !== 'master') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const userId = parseInt(params.id, 10);
        if (isNaN(userId)) {
            return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
        }

        const body = await request.json();
        const action = body.action as 'toggleRole' | 'resetPassword' | undefined;

        if (!action) {
            return NextResponse.json({ error: 'action は必須です。' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return NextResponse.json({ error: 'ユーザーが存在しません。' }, { status: 404 });
        }

        if (action === 'toggleRole') {
            const newRole = user.role === 'master' ? 'staff' : 'master';

            // 最後のマスターをスタッフにしないように制御
            if (user.role === 'master' && newRole === 'staff') {
                const masterCount = await prisma.user.count({ where: { role: 'master' } });
                if (masterCount <= 1) {
                    return NextResponse.json({ error: '少なくとも1名のマスター権限ユーザーが必要です。' }, { status: 400 });
                }
            }

            const updated = await prisma.user.update({
                where: { id: userId },
                data: { role: newRole },
                select: {
                    id: true,
                    username: true,
                    role: true,
                    createdAt: true,
                },
            });

            return NextResponse.json(updated);
        }

        if (action === 'resetPassword') {
            const tempPassword = 'Temp-' + Math.random().toString(36).slice(2, 8);
            const hashed = await bcrypt.hash(tempPassword, 10);

            await prisma.user.update({
                where: { id: userId },
                data: { passwordHash: hashed },
            });

            return NextResponse.json({ tempPassword });
        }

        return NextResponse.json({ error: 'サポートされていない action です。' }, { status: 400 });
    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'ユーザーの更新に失敗しました。' }, { status: 500 });
    }
}
