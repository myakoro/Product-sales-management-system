const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.findUnique({
        where: { username: 'admin' }
    });

    if (user) {
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                role: 'master',
                passwordHash: hashedPassword
            }
        });
        console.log('Updated user:', updated);
    } else {
        console.log('User admin not found, creating...');
        const created = await prisma.user.create({
            data: {
                username: 'admin',
                passwordHash: hashedPassword,
                role: 'master'
            }
        });
        console.log('Created user:', created);
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
