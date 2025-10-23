#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testApiData() {
  console.log('🔍 Testing API data structure...\n');

  // Get latest stats
  const latestStats = await prisma.mentorStats.findFirst({
    orderBy: { periodDate: 'desc' },
    select: { periodDate: true },
  });

  console.log(`Latest periodDate: ${latestStats?.periodDate}\n`);

  if (!latestStats) {
    console.log('❌ No stats found!');
    return;
  }

  const periodDate = latestStats.periodDate;

  // Fetch mentors like the API does
  const mentors = await prisma.mentor.findMany({
    include: {
      team: { select: { name: true } },
    },
    take: 5, // Just first 5 for testing
  });

  console.log(`Found ${mentors.length} mentors\n`);

  // Get stats for these mentors
  const mentorIds = mentors.map((m) => m.id);
  const stats = await prisma.mentorStats.findMany({
    where: {
      mentorId: { in: mentorIds },
      periodDate,
    },
  });

  console.log(`Found ${stats.length} stats for period ${periodDate}\n`);

  // Build response like API does
  const statsMap = new Map(stats.map((s) => [s.mentorId, s]));

  const mentorsWithStats = mentors.map((mentor) => {
    const stat = statsMap.get(mentor.id);
    return {
      id: mentor.id,
      mentorId: mentor.mentorId,
      mentorName: mentor.mentorName,
      teamName: mentor.team.name,
      teamId: mentor.teamId,
      avgCcPct: stat?.avgClassConsumption || 0,
      avgScPct: stat?.superClassPct || 0,
      avgUpPct: stat?.upgradeRatePct || 0,
      avgFixedPct: stat?.fixedRatePct || 0,
      weightedScore: stat?.weightedScore || 0,
      status: stat?.status || 'BELOW',
      targetsHit: stat?.targetsHit || 0,
      totalStudents: stat?.totalStudents || 0,
      hasStat: !!stat,
    };
  });

  console.log('Sample mentor data:');
  console.log(JSON.stringify(mentorsWithStats.slice(0, 2), null, 2));

  await prisma.$disconnect();
}

testApiData().catch(console.error);
