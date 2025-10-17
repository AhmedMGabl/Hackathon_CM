import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create teams
  const salesTeam = await prisma.team.upsert({
    where: { name: 'Sales Team Alpha' },
    update: {},
    create: {
      name: 'Sales Team Alpha',
      description: 'Primary sales team',
    },
  });

  const supportTeam = await prisma.team.upsert({
    where: { name: 'Support Team Beta' },
    update: {},
    create: {
      name: 'Support Team Beta',
      description: 'Customer support team',
    },
  });

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });

  // Create team leader
  const leaderPassword = await bcrypt.hash('leader123', 10);
  const leader = await prisma.user.upsert({
    where: { email: 'leader@example.com' },
    update: {},
    create: {
      email: 'leader@example.com',
      password: leaderPassword,
      firstName: 'Team',
      lastName: 'Leader',
      role: 'LEADER',
      teamId: salesTeam.id,
    },
  });

  // Create sample agents
  const agents = await Promise.all([
    prisma.agent.upsert({
      where: { agentId: 'AGT001' },
      update: {},
      create: {
        agentId: 'AGT001',
        agentName: 'Kiran Patel',
        teamId: salesTeam.id,
      },
    }),
    prisma.agent.upsert({
      where: { agentId: 'AGT002' },
      update: {},
      create: {
        agentId: 'AGT002',
        agentName: 'Aisha Khan',
        teamId: salesTeam.id,
      },
    }),
    prisma.agent.upsert({
      where: { agentId: 'AGT003' },
      update: {},
      create: {
        agentId: 'AGT003',
        agentName: 'Marcus Chen',
        teamId: supportTeam.id,
      },
    }),
  ]);

  // Create default target configuration
  const now = new Date();
  const currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.target.upsert({
    where: {
      teamId_period: {
        teamId: salesTeam.id,
        period: currentPeriod,
      },
    },
    update: {},
    create: {
      teamId: salesTeam.id,
      period: currentPeriod,
      ccTarget: 80,
      scTarget: 15,
      upTarget: 25,
      fixedTarget: 60,
      referralAchievementTarget: 80,
      conversionTarget: 30,
      aboveThreshold: 100,
      warningThreshold: 90,
      ccWeight: 25,
      scWeight: 25,
      upWeight: 25,
      fixedWeight: 25,
    },
  });

  // Create sample metric snapshots with realistic data
  const weeklyData = [
    { week: 1, cc: 75, sc: 12, up: 20, fixed: 55 },
    { week: 2, cc: 82, sc: 16, up: 28, fixed: 62 },
    { week: 3, cc: 88, sc: 18, up: 30, fixed: 68 },
    { week: 4, cc: 92, sc: 20, up: 32, fixed: 72 },
  ];

  for (const agent of agents) {
    for (const data of weeklyData) {
      await prisma.metricSnapshot.upsert({
        where: {
          agentId_period_weekOfMonth: {
            agentId: agent.id,
            period: currentPeriod,
            weekOfMonth: data.week,
          },
        },
        update: {},
        create: {
          agentId: agent.id,
          period: currentPeriod,
          weekOfMonth: data.week,
          ccPct: data.cc + Math.random() * 5,
          scPct: data.sc + Math.random() * 3,
          upPct: data.up + Math.random() * 4,
          fixedPct: data.fixed + Math.random() * 5,
          referralLeads: Math.floor(20 + Math.random() * 10),
          referralShowups: Math.floor(15 + Math.random() * 8),
          referralPaid: Math.floor(10 + Math.random() * 5),
          referralAchievementPct: 75 + Math.random() * 15,
          totalLeads: Math.floor(50 + Math.random() * 20),
          recoveredLeads: Math.floor(15 + Math.random() * 10),
          unrecoveredLeads: Math.floor(30 + Math.random() * 10),
          unrecoveredNotes: ['Follow up needed', 'Rescheduled'],
          conversionPct: 25 + Math.random() * 10,
          weightedScore: 0.85 + Math.random() * 0.15,
          targetsHit: data.week >= 3 ? 3 : 2,
          status: data.week >= 3 ? 'ABOVE' : 'WARNING',
        },
      });
    }
  }

  // Create sample alert rules
  await prisma.alertRule.upsert({
    where: { id: 'rule-below-target' },
    update: {},
    create: {
      id: 'rule-below-target',
      name: 'Below Target Alert',
      description: 'Triggers when agent is below target for 2 consecutive weeks',
      enabled: true,
      ruleType: 'BELOW_TARGET',
      conditions: {
        metric: 'weightedScore',
        threshold: 90,
        consecutivePeriods: 2,
      },
    },
  });

  console.log('✅ Seeding completed!');
  console.log('\n📝 Login credentials:');
  console.log('Admin: admin@example.com / admin123');
  console.log('Leader: leader@example.com / leader123');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
