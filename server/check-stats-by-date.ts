#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkStatsByDate() {
  const dates = await prisma.mentorStats.groupBy({
    by: ['periodDate'],
    _count: { id: true },
    orderBy: { periodDate: 'desc' },
    take: 10,
  });

  console.log('Stats count by date (latest 10):');
  dates.forEach(d => {
    console.log(`  ${d.periodDate.toISOString()}: ${d._count.id} mentors`);
  });

  // Find date with most stats
  const allDates = await prisma.mentorStats.groupBy({
    by: ['periodDate'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  });

  if (allDates.length > 0) {
    console.log(`\nDate with MOST stats: ${allDates[0].periodDate.toISOString()} (${allDates[0]._count.id} mentors)`);
  }

  await prisma.$disconnect();
}

checkStatsByDate().catch(console.error);
