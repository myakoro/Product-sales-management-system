
const { PrismaClient } = require('@prisma/client');

// 本番DBを直接指定
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./prisma/prod.db'
        }
    }
});

async function main() {
    console.log('=== 本番DB確認 ===\n');

    // 取込履歴を確認
    const history = await prisma.importHistory.findMany({
        where: {
            targetYm: '2025-02'
        },
        take: 5
    });

    console.log('取込履歴 (2025-02):');
    console.log(JSON.stringify(history, null, 2));

    // Fr013を含む売上レコードを確認
    const fr013Records = await prisma.salesRecord.findMany({
        where: {
            periodYm: '2025-02',
            OR: [
                { productCode: { contains: 'FR013' } },
                { productCode: { contains: 'Fr013' } },
                { productCode: { contains: 'fr013' } }
            ]
        }
    });

    console.log('\nFr013関連レコード:');
    console.log(JSON.stringify(fr013Records, null, 2));

    // 2025-02の全レコード数
    const count = await prisma.salesRecord.count({
        where: { periodYm: '2025-02' }
    });

    console.log(`\n2025-02の総レコード数: ${count}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
