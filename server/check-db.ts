#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('📊 Checking database contents...\n');

  // Count records
  const mentorCount = await prisma.mentor.count();
  const teamCount = await prisma.team.count();
  const metricCount = await prisma.metricDaily.count();
  const userCount = await prisma.user.count();

  console.log('Counts:');
  console.log(`  Mentors: ${mentorCount}`);
  console.log(`  Teams: ${teamCount}`);
  console.log(`  Metrics (MetricDaily): ${metricCount}`);
  console.log(`  Users: ${userCount}`);

  // Sample mentors
  console.log('\nSample Mentors (5):');
  const mentors = await prisma.mentor.findMany({
    take: 5,
    include: { team: true }
  });
  mentors.forEach(m => {
    console.log(`  - ${m.mentorName} (${m.team?.name || 'No team'})`);
  });

  // Sample metrics
  console.log('\nSample Metrics (5):');
  const metrics = await prisma.metricDaily.findMany({
    take: 5,
    include: { mentor: true }
  });
  metrics.forEach(m => {
    console.log(`  - ${m.mentor.mentorName}: CC=${m.ccPct?.toFixed(1)}%, SC=${m.scPct?.toFixed(1)}%, UP=${m.upPct?.toFixed(1)}%, Fixed=${m.fixedPct?.toFixed(1)}%`);
  });

  // Check date range
  const oldestMetric = await prisma.metricDaily.findFirst({
    orderBy: { periodDate: 'asc' }
  });
  const newestMetric = await prisma.metricDaily.findFirst({
    orderBy: { periodDate: 'desc' }
  });

  console.log('\nDate Range:');
  console.log(`  Oldest: ${oldestMetric?.periodDate}`);
  console.log(`  Newest: ${newestMetric?.periodDate}`);

  await prisma.$disconnect();
}

checkDatabase().catch(console.error);
