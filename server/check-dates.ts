#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDates() {
  console.log('MetricDaily dates:');
  const metricDates = await prisma.metricDaily.findMany({
    select: { periodDate: true },
    distinct: ['periodDate'],
    orderBy: { periodDate: 'desc' },
    take: 5,
  });
  metricDates.forEach(d => console.log('  ', d.periodDate));

  console.log('\nMentorStats dates:');
  const statsDates = await prisma.mentorStats.findMany({
    select: { periodDate: true },
    distinct: ['periodDate'],
    orderBy: { periodDate: 'desc' },
    take: 5,
  });
  statsDates.forEach(d => console.log('  ', d.periodDate));

  // Check counts for latest date
  if (metricDates.length > 0) {
    const latestDate = metricDates[0].periodDate;
    const metricsCount = await prisma.metricDaily.count({
      where: { periodDate: latestDate }
    });
    const statsCount = await prisma.mentorStats.count({
      where: { periodDate: latestDate }
    });
    console.log(`\nFor latest date ${latestDate}:`);
    console.log(`  MetricDaily: ${metricsCount}`);
    console.log(`  MentorStats: ${statsCount}`);
  }

  await prisma.$disconnect();
}

checkDates().catch(console.error);
