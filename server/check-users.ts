#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('👥 Checking users and teams...\n');

  const users = await prisma.user.findMany({
    include: { team: true }
  });

  console.log('Users:');
  users.forEach(u => {
    console.log(`  - ${u.email} (${u.role}) - Team: ${u.team?.name || 'No team'}`);
  });

  const mentorCount = await prisma.mentor.count();
  const statsCount = await prisma.mentorStats.count();

  console.log(`\nMentors: ${mentorCount}`);
  console.log(`Stats: ${statsCount}`);

  // Check latest stats date
  const latest = await prisma.mentorStats.findFirst({
    orderBy: { periodDate: 'desc' }
  });

  console.log(`Latest stats date: ${latest?.periodDate}`);

  await prisma.$disconnect();
}

checkUsers().catch(console.error);
