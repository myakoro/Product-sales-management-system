
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 取込履歴を確認
    const history = await prisma.importHistory.findMany({
        where: {
            targetYm: '2025-02'
        },
        take: 5
    });

    console.log('=== 取込履歴 ===');
    console.log(JSON.stringify(history, null, 2));

    // 全期間の売上レコード数を確認
    const allRecords = await prisma.salesRecord.groupBy({
        by: ['periodYm'],
        _count: true
    });

    console.log('\n=== 期間別レコード数 ===');
    console.log(JSON.stringify(allRecords, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
