
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const records = await prisma.salesRecord.findMany({
        where: {
            periodYm: '2025-02'
        },
        take: 10,
        select: {
            productCode: true,
            quantity: true,
            externalOrderId: true
        }
    });
    console.log(JSON.stringify(records, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
