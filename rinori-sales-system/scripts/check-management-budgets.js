const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Management Budget Data ---');
    const budgets = await prisma.managementBudget.findMany({
        orderBy: { periodYm: 'asc' }
    });

    if (budgets.length === 0) {
        console.log('No budget data found.');
    } else {
        budgets.forEach(b => {
            console.log(`${b.periodYm}: ${b.amount.toLocaleString()} (Raw: ${b.amount})`);
        });
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
