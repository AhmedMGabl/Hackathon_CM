#!/usr/bin/env node
/**
 * Clean up seed data to show only real uploaded Excel data
 * Keeps only data from today (actual uploads)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupSeedData() {
  console.log('🧹 Cleaning up old seed data...\n');

  // Get today's date (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(`Keeping only data from: ${today}\n`);

  // Delete old metrics (before today)
  const deletedMetrics = await prisma.metricDaily.deleteMany({
    where: {
      periodDate: {
        lt: today
      }
    }
  });

  console.log(`✓ Deleted ${deletedMetrics.count} old MetricDaily records`);

  // Delete old stats
  const deletedStats = await prisma.mentorStats.deleteMany({
    where: {
      periodDate: {
        lt: today
      }
    }
  });

  console.log(`✓ Deleted ${deletedStats.count} old MentorStats records`);

  // Delete mentors with no metrics
  const mentorsWithMetrics = await prisma.metricDaily.findMany({
    select: { mentorId: true },
    distinct: ['mentorId']
  });

  const mentorIdsWithData = mentorsWithMetrics.map(m => m.mentorId);

  const deletedMentors = await prisma.mentor.deleteMany({
    where: {
      id: {
        notIn: mentorIdsWithData
      }
    }
  });

  console.log(`✓ Deleted ${deletedMentors.count} mentors with no data`);

  // Delete teams with no mentors
  const teamsWithMentors = await prisma.mentor.findMany({
    select: { teamId: true },
    distinct: ['teamId']
  });

  const teamIdsWithMentors = teamsWithMentors.map(t => t.teamId);

  const deletedTeams = await prisma.team.deleteMany({
    where: {
      id: {
        notIn: teamIdsWithMentors
      }
    }
  });

  console.log(`✓ Deleted ${deletedTeams.count} teams with no mentors`);

  // Count remaining data
  const remainingMentors = await prisma.mentor.count();
  const remainingTeams = await prisma.team.count();
  const remainingMetrics = await prisma.metricDaily.count();

  console.log(`\n📊 Remaining data:`);
  console.log(`   Mentors: ${remainingMentors}`);
  console.log(`   Teams: ${remainingTeams}`);
  console.log(`   Metrics: ${remainingMetrics}`);

  console.log(`\n✅ Cleanup complete! Only real uploaded data remains.`);

  await prisma.$disconnect();
}

cleanupSeedData().catch(console.error);
