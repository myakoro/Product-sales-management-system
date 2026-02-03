const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Fetch all tax rates
    const rates = await prisma.taxRate.findMany();
    console.log('Current Tax Rates:', rates);

    // 2. Find the test rate (2026-01)
    const testRate = rates.find(r => r.startYm === '2026-01');

    if (testRate) {
        console.log('Test rate found:', testRate);
        // 3. Delete it
        const deleted = await prisma.taxRate.delete({
            where: { id: testRate.id }
        });
        console.log('Deleted test rate:', deleted);
    } else {
        console.log('Test rate 2026-01 NOT found (creation might have failed or it was deleted?)');
    }
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
