import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  const users = await prisma.user.findMany({
    select: {
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      teamId: true
    }
  });

  console.log('Users in database:');
  users.forEach(u => {
    console.log(`  ${u.email} - ${u.role} (${u.firstName} ${u.lastName}) - Team: ${u.teamId || 'None'}`);
  });

  await prisma.$disconnect();
}

checkUsers().catch(console.error);
