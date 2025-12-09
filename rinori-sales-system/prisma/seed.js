const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Delete existing admin to force recreation
    try {
        await prisma.user.delete({ where: { username: 'admin' } });
    } catch (e) {
        // Ignore if not found
    }

    const upsertUser = await prisma.user.create({
        data: {
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
