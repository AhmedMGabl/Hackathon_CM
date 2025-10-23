#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLatestStats() {
  const latest = await prisma.mentorStats.findFirst({
    orderBy: { periodDate: 'desc' },
    select: { periodDate: true },
  });

  if (!latest) {
    console.log('No stats found');
    return;
  }

  console.log(`Latest periodDate: ${latest.periodDate}\n`);

  const stats = await prisma.mentorStats.findMany({
    where: { periodDate: latest.periodDate },
    include: { mentor: { include: { team: true } } },
  });

  console.log(`Found ${stats.length} stats for latest date\n`);

  console.log('Mentors with stats:');
  stats.slice(0, 5).forEach(s => {
    console.log(`  ${s.mentor.mentorName} (${s.mentor.team.name})`);
    console.log(`    CC: ${s.avgClassConsumption}%, SC: ${s.superClassPct}%`);
    console.log(`    Weighted Score: ${s.weightedScore}, Status: ${s.status}`);
  });

  await prisma.$disconnect();
}

checkLatestStats().catch(console.error);
