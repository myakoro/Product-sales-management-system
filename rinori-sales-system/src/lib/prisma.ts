import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// 実行時に使用するDB URL
// - 本番(Render)では RUNTIME_DATABASE_URL="file:/var/data/prod.db" を想定
// - それがなければ DATABASE_URL(例: file:./dev.db) を利用
const datasourceUrl = process.env.RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient(
        process.env.RUNTIME_DATABASE_URL
            ? {
                datasources: {
                    db: { url: process.env.RUNTIME_DATABASE_URL }
                }
            }
            : undefined
    )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
