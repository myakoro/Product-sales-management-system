const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    if (user) {
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: { role: 'master' }
        });
        console.log('Updated user:', updated);
    } else {
        console.log('User admin not found');
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
