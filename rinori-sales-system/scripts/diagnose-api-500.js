const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function diagnoseGet() {
    const startYm = '2026-01';
    const endYm = '2026-12';

    console.log(`Diagnosing GET for ${startYm} to ${endYm}...`);

    try {
        const budgets = await prisma.managementBudget.findMany({
            where: {
                periodYm: {
                    gte: startYm,
                    lte: endYm,
                },
            },
            orderBy: {
                periodYm: 'asc',
            },
        });
        console.log('Success! Count:', budgets.length);
    } catch (error) {
        console.error('FAILED during Prisma query:');
        console.error(error);
    }
}

diagnoseGet()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
