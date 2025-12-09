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
        // 環境変数が設定されていない場合は従来どおりデフォルト設定で生成
        datasourceUrl
            ? {
                datasources: {
                    db: { url: datasourceUrl }
                }
            }
            : undefined
    )

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
