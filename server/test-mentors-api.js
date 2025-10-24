import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testMentorsApi() {
  console.log('=== Testing Mentors API Logic ===\n');

  // Step 1: Get period with most stats
  const periodWithMostStats = await prisma.mentorStats.groupBy({
    by: ['periodDate'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 1,
  });

  if (!periodWithMostStats.length) {
    console.log('No stats found!');
    await prisma.$disconnect();
    return;
  }

  const periodDate = periodWithMostStats[0].periodDate;
  console.log('Period with most stats:', periodDate.toISOString().split('T')[0]);
  console.log('Count:', periodWithMostStats[0]._count.id);

  // Step 2: Fetch mentors (no filters, just like the frontend)
  const mentorWhere = {};
  const page = 1;
  const limit = 100;

  const mentors = await prisma.mentor.findMany({
    where: mentorWhere,
    include: {
      team: { select: { name: true } },
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  console.log('\nMentors fetched:', mentors.length);

  if (mentors.length > 0) {
    console.log('Sample mentor:', mentors[0].mentorName, '- Team:', mentors[0].team.name);
  }

  // Step 3: Get stats for these mentors
  const mentorIds = mentors.map((m) => m.id);
  console.log('\nLooking for stats for', mentorIds.length, 'mentors');
  console.log('Sample mentor IDs:', mentorIds.slice(0, 3));

  const stats = await prisma.mentorStats.findMany({
    where: {
      mentorId: { in: mentorIds },
      periodDate,
    },
  });

  console.log('Stats found:', stats.length);

  if (stats.length > 0) {
    console.log('Sample stat:');
    console.log('  Mentor ID:', stats[0].mentorId);
    console.log('  Weighted Score:', stats[0].weightedScore);
    console.log('  Status:', stats[0].status);
  }

  // Step 4: Check if mentor IDs in stats match mentor IDs in mentors
  const statsMap = new Map(stats.map((s) => [s.mentorId, s]));
  const mentorsWithStats = mentors.filter(m => statsMap.has(m.id));
  console.log('\nMentors with matching stats:', mentorsWithStats.length);

  if (mentorsWithStats.length === 0 && mentors.length > 0 && stats.length > 0) {
    console.log('\n⚠️  Problem: Mentors exist and stats exist, but IDs don\'t match!');
    console.log('Sample mentor ID from mentors table:', mentors[0].id);
    console.log('Sample mentorId from stats table:', stats[0].mentorId);
  }

  await prisma.$disconnect();
}

testMentorsApi().catch(console.error);
