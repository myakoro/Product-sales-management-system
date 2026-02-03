import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET: ユーザー一覧取得（マスター権限のみ）
export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role as string | undefined;

        if (!session || role !== 'master') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ error: 'ユーザー一覧の取得に失敗しました。' }, { status: 500 });
    }
}

// POST: ユーザー新規作成（マスター権限のみ）
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        const role = (session?.user as any)?.role as string | undefined;

        if (!session || role !== 'master') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { username, role: userRole, initialPassword } = body as {
            username?: string;
            role?: 'master' | 'staff';
            initialPassword?: string;
        };

        if (!username || !userRole || !initialPassword) {
            return NextResponse.json({ error: 'ユーザー名、権限、初期パスワードを入力してください。' }, { status: 400 });
        }

        if (initialPassword.length < 8) {
            return NextResponse.json({ error: '初期パスワードは8文字以上で入力してください。' }, { status: 400 });
        }

        const hashed = await bcrypt.hash(initialPassword, 10);

        const user = await prisma.user.create({
            data: {
                username,
                role: userRole,
                passwordHash: hashed,
            },
            select: {
                id: true,
                username: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json(user, { status: 201 });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return NextResponse.json({ error: 'このユーザー名は既に存在します。' }, { status: 409 });
        }
        console.error('Error creating user:', error);
        return NextResponse.json({ error: 'ユーザーの作成に失敗しました。' }, { status: 500 });
    }
}
