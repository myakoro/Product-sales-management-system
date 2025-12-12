const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const upsertUser = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            passwordHash: hashedPassword,
            role: 'master',
        },
        create: {
            username: 'admin',
            passwordHash: hashedPassword,
            role: 'master',
        },
    });

    console.log({ upsertUser });

    // Also create a staff user for testing
    const staffPassword = await bcrypt.hash('staff123', 10);
    const upsertStaff = await prisma.user.upsert({
        where: { username: 'staff' },
        update: {
            passwordHash: staffPassword,
            role: 'staff',
        },
        create: {
            username: 'staff',
            passwordHash: staffPassword,
            role: 'staff',
        },
    });
    console.log({ upsertStaff });

    const defaultSalesChannels = ['EC', 'モール', '卸', '催事ポップアップ', 'その他'];
    for (const name of defaultSalesChannels) {
        await prisma.salesChannel.upsert({
            where: { name },
            update: { isActive: true },
            create: { name, isActive: true },
        });
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
