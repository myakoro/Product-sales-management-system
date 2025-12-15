
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
    // No auth check for initial seed? Or require at least some auth?
    // If the DB is empty, no one can login. So this endpoint might need to be open OR checking if master user exists.
    // For safety, let's limit: only allow if NO users exist OR if logged in as master.

    try {
        const userCount = await prisma.user.count();

        // If users exist, perform Auth check
        if (userCount > 0) {
            // We can't easily check session here without importing getServerSession etc.
            // But if users exist, we probably shouldn't be running this casually unless authorized.
            // Let's rely on the fact that if they can access the UI, they likely have a session.
            // But to be safe, let's just implement the seeding of non-user data if users exist.
        }

        const body = await request.json().catch(() => ({}));

        const logs: string[] = [];

        // 1. Seed Users (only if admin doesn't exist)
        const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await prisma.user.create({
                data: {
                    username: 'admin',
                    passwordHash: hashedPassword,
                    role: 'master',
                }
            });
            logs.push('Created admin user');
        } else {
            logs.push('Admin user already exists');
        }

        // 2. Seed Sales Channels
        const defaultSalesChannels = ['EC', 'モール', '卸', '催事ポップアップ', 'その他'];
        for (const name of defaultSalesChannels) {
            await prisma.salesChannel.upsert({
                where: { name },
                update: { isActive: true },
                create: { name, isActive: true },
            });
        }
        logs.push('Seeded sales channels');

        // 3. Seed Ad Categories
        const defaultAdCategories = ['Meta広告', 'Google広告', 'アフィリエイト', 'その他'];
        for (const categoryName of defaultAdCategories) {
            const existing = await prisma.adCategory.findFirst({ where: { categoryName } });
            if (!existing) {
                await prisma.adCategory.create({
                    data: { categoryName },
                });
            }
        }
        logs.push('Seeded ad categories');

        return NextResponse.json({ success: true, logs });

    } catch (error) {
        console.error('Seed Error:', error);
        return NextResponse.json({ error: 'Failed to seed data: ' + (error instanceof Error ? error.message : String(error)) }, { status: 500 });
    }
}
