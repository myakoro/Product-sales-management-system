const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const productCount = await prisma.product.count();
        const userCount = await prisma.user.count();
        const importHistoryCount = await prisma.importHistory.count();

        console.log(JSON.stringify({
            productCount,
            userCount,
            importHistoryCount
        }, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
