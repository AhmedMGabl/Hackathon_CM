#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUsers() {
  console.log('🔧 Fixing user team assignments...\n');

  // Get first two real teams from uploaded data
  const teams = await prisma.team.findMany({
    take: 2,
    orderBy: { name: 'asc' }
  });

  console.log('Available teams:');
  teams.forEach(t => console.log(`  - ${t.name} (${t.id})`));

  if (teams.length >= 2) {
    // Assign Kiran to first team
    await prisma.user.update({
      where: { email: 'kiran@cmetrics.app' },
      data: { teamId: teams[0].id }
    });
    console.log(`\n✓ Assigned Kiran to: ${teams[0].name}`);

    // Assign Aisha to second team
    await prisma.user.update({
      where: { email: 'aisha@cmetrics.app' },
      data: { teamId: teams[1].id }
    });
    console.log(`✓ Assigned Aisha to: ${teams[1].name}`);
  }

  // Make admin SUPER_ADMIN (it should already be, but let's confirm)
  await prisma.user.update({
    where: { email: 'admin@cmetrics.app' },
    data: { role: 'SUPER_ADMIN', teamId: null }
  });
  console.log(`✓ Confirmed admin as SUPER_ADMIN (no team = see all data)`);

  console.log('\n✅ User assignments fixed!');
  console.log('\n📝 Login credentials:');
  console.log('   Super Admin: admin@cmetrics.app / Admin123!');
  console.log(`   Kiran (Leader): kiran@cmetrics.app / Leader123! (Team: ${teams[0]?.name})`);
  console.log(`   Aisha (Leader): aisha@cmetrics.app / Leader123! (Team: ${teams[1]?.name})`);

  await prisma.$disconnect();
}

fixUsers().catch(console.error);
