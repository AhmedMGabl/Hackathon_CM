import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  calculateWeightedScore,
  calculateStatus,
  countTargetsHit,
  type TargetConfig,
} from '../src/utils/metrics.js';

const prisma = new PrismaClient();

// Mentor names for realistic data
const MENTOR_NAMES = [
  'Emma Thompson', 'Liam Chen', 'Sophia Rodriguez', 'Noah Kim', 'Olivia Patel', 'Ethan Singh',
  'Ava Martinez', 'Mason Lee', 'Isabella Garcia', 'Lucas Johnson', 'Mia Williams', 'Alexander Brown',
  'Charlotte Davis', 'James Wilson', 'Amelia Miller', 'Benjamin Taylor', 'Harper Anderson', 'Elijah Thomas',
];

async function main() {
  console.log('🌱 Seeding CMetrics database...\n');

  // Clear existing data in correct order
  console.log('📦 Clearing existing data...');
  await prisma.alert.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.metricDaily.deleteMany();
  await prisma.mentor.deleteMany();
  await prisma.config.deleteMany();
  await prisma.target.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  // Create teams
  console.log('👥 Creating teams...');
  const teams = await Promise.all([
    prisma.team.create({
      data: { name: 'Alpha Squad', description: 'High-performance course mentoring team' },
    }),
    prisma.team.create({
      data: { name: 'Beta Force', description: 'Student retention specialists' },
    }),
    prisma.team.create({
      data: { name: 'Gamma Unit', description: 'Growth and expansion mentors' },
    }),
  ]);
  console.log(`✅ Created ${teams.length} teams`);

  // Create users
  console.log('🔐 Creating users...');
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@cmetrics.app',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
    },
  });

  const leaderPassword = await bcrypt.hash('Leader123!', 10);
  const leaders = await Promise.all([
    prisma.user.create({
      data: {
        email: 'kiran@cmetrics.app',
        password: leaderPassword,
        firstName: 'Kiran',
        lastName: 'Patel',
        role: Role.LEADER,
        teamId: teams[0].id, // Alpha Squad
      },
    }),
    prisma.user.create({
      data: {
        email: 'aisha@cmetrics.app',
        password: leaderPassword,
        firstName: 'Aisha',
        lastName: 'Khan',
        role: Role.LEADER,
        teamId: teams[1].id, // Beta Force
      },
    }),
  ]);
  console.log(`✅ Created 1 admin + ${leaders.length} leaders`);

  // Create global config
  console.log('⚙️  Creating global configuration...');
  const globalConfig = await prisma.config.create({
    data: {
      teamId: null, // Global default
      ccTarget: 80,
      scTarget: 15,
      upTarget: 25,
      fixedTarget: 60,
      referralAchievementTarget: 80,
      conversionTarget: 30,
      ccWeight: 30,
      scWeight: 25,
      upWeight: 25,
      fixedWeight: 20,
      aboveThreshold: 100,
      warningThreshold: 90,
      pacingWeek: 4,
      alertThresholds: {
        belowTargetPct: 70,
        consecutivePeriods: 3,
        missingDataDays: 2,
        varianceThreshold: 30,
      },
    },
  });
  console.log('✅ Created global config');

  // Create mentors (18 per team = 54 total)
  console.log(`👨‍🏫 Creating mentors (${MENTOR_NAMES.length} per team)...`);
  const allMentors: any[] = [];
  for (const team of teams) {
    for (let i = 0; i < MENTOR_NAMES.length; i++) {
      const mentor = await prisma.mentor.create({
        data: {
          mentorId: `CM-${team.name.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          mentorName: MENTOR_NAMES[i],
          teamId: team.id,
        },
      });
      allMentors.push({ ...mentor, teamName: team.name });
    }
  }
  console.log(`✅ Created ${allMentors.length} mentors across ${teams.length} teams`);

  // Generate 60 days of metrics for each mentor
  console.log('📊 Generating 60 days of metrics per mentor...');
  const daysToGenerate = 60;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToGenerate);

  const targetConfig: TargetConfig = {
    ccTarget: globalConfig.ccTarget,
    scTarget: globalConfig.scTarget,
    upTarget: globalConfig.upTarget,
    fixedTarget: globalConfig.fixedTarget,
    referralAchievementTarget: globalConfig.referralAchievementTarget,
    conversionTarget: globalConfig.conversionTarget,
    aboveThreshold: globalConfig.aboveThreshold,
    warningThreshold: globalConfig.warningThreshold,
    ccWeight: globalConfig.ccWeight,
    scWeight: globalConfig.scWeight,
    upWeight: globalConfig.upWeight,
    fixedWeight: globalConfig.fixedWeight,
  };

  let totalMetrics = 0;
  let belowTargetMentors: Array<{ mentor: any; periodDate: Date; weightedScore: number }> = [];
  let missingDataMentors: Array<{ mentor: any; periodDate: Date }> = [];

  for (const mentor of allMentors) {
    // Determine mentor performance tier (some struggle, some excel, some average)
    const performanceTier = Math.random();
    const baseMultiplier = performanceTier < 0.2 ? 0.7 : performanceTier < 0.7 ? 0.95 : 1.15;

    // Track consecutive days for missing data alerts
    let consecutiveMissingDays = 0;

    for (let day = 0; day < daysToGenerate; day++) {
      const periodDate = new Date(startDate);
      periodDate.setDate(periodDate.getDate() + day);

      const weekOfMonth = Math.ceil(periodDate.getDate() / 7);

      // 5% chance of missing data (intentionally for alerts)
      if (Math.random() < 0.05) {
        consecutiveMissingDays++;
        if (consecutiveMissingDays >= 2) {
          missingDataMentors.push({ mentor, periodDate });
        }
        continue; // Skip this day
      } else {
        consecutiveMissingDays = 0;
      }

      // Add realistic daily variance: ±5-15%
      const dailyVariance = () => (Math.random() - 0.5) * (Math.random() < 0.1 ? 30 : 15); // 10% chance of high variance (for variance spike alerts)

      // Base metrics with performance tier and trend (improve over time)
      const trendFactor = 1 + (day / daysToGenerate) * 0.15; // 15% improvement trend over 60 days
      const ccPct = Math.max(0, Math.min(100, 75 * baseMultiplier * trendFactor + dailyVariance()));
      const scPct = Math.max(0, Math.min(100, 12 * baseMultiplier * trendFactor + dailyVariance()));
      const upPct = Math.max(0, Math.min(100, 22 * baseMultiplier * trendFactor + dailyVariance()));
      const fixedPct = Math.max(0, Math.min(100, 58 * baseMultiplier * trendFactor + dailyVariance()));

      // Referral funnel
      const referralLeads = Math.floor(Math.random() * 30) + 15;
      const referralShowups = Math.floor(referralLeads * (0.55 + Math.random() * 0.3));
      const referralPaid = Math.floor(referralShowups * (0.35 + Math.random() * 0.35));

      // Lead recovery
      const totalLeads = Math.floor(Math.random() * 80) + 40;
      const recoveredLeads = Math.floor(totalLeads * (0.2 + Math.random() * 0.2) * baseMultiplier);
      const unrecoveredLeads = totalLeads - recoveredLeads;

      // Calculate weighted score
      const weightedScore = calculateWeightedScore(
        { ccPct, scPct, upPct, fixedPct },
        targetConfig
      );

      // Calculate status
      const status = calculateStatus(weightedScore, targetConfig);

      // Count targets hit
      const targetsHit = countTargetsHit({ ccPct, scPct, upPct, fixedPct }, targetConfig);

      // Track mentors below target for alert triggers
      if (status === 'BELOW') {
        belowTargetMentors.push({ mentor, periodDate, weightedScore });
      }

      await prisma.metricDaily.create({
        data: {
          mentorId: mentor.id,
          teamId: mentor.teamId,
          periodDate,
          weekOfMonth,
          ccPct,
          scPct,
          upPct,
          fixedPct,
          referralLeads,
          referralShowups,
          referralPaid,
          totalLeads,
          recoveredLeads,
          unrecoveredLeads,
          notes: unrecoveredLeads > 40 ? ['High unrecovered volume', 'Needs review'] : [],
          checksum: `${mentor.mentorId}:${periodDate.toISOString().split('T')[0]}`,
        },
      });

      totalMetrics++;
    }
  }
  console.log(`✅ Created ${totalMetrics} metric records`);

  // Create alert rules
  console.log('⚠️  Creating alert rules...');
  const rules = await Promise.all([
    prisma.alertRule.create({
      data: {
        name: 'Below Target - Critical',
        description: 'Mentor performing below 70% of target for 3+ consecutive days',
        enabled: true,
        ruleType: 'BELOW_TARGET',
        conditions: {
          metric: 'weightedScore',
          threshold: 70,
          consecutivePeriods: 3,
        },
      },
    }),
    prisma.alertRule.create({
      data: {
        name: 'Missing Data',
        description: 'No data submitted for 2+ consecutive days',
        enabled: true,
        ruleType: 'MISSING_DATA',
        conditions: {
          consecutivePeriods: 2,
        },
      },
    }),
    prisma.alertRule.create({
      data: {
        name: 'Variance Spike',
        description: 'Performance variance spike detected (30%+ deviation)',
        enabled: true,
        ruleType: 'VARIANCE_SPIKE',
        conditions: {
          threshold: 30,
        },
      },
    }),
  ]);
  console.log(`✅ Created ${rules.length} alert rules`);

  // Trigger sample alerts
  console.log('🚨 Triggering sample alerts...');
  const belowTargetRule = rules.find((r) => r.ruleType === 'BELOW_TARGET')!;
  const missingDataRule = rules.find((r) => r.ruleType === 'MISSING_DATA')!;

  // Group below-target occurrences by mentor
  const belowTargetByMentor = belowTargetMentors.reduce((acc, item) => {
    if (!acc[item.mentor.id]) acc[item.mentor.id] = [];
    acc[item.mentor.id].push(item);
    return acc;
  }, {} as Record<string, typeof belowTargetMentors>);

  // Find mentors with 3+ consecutive below-target days
  let triggeredBelowTargetAlerts = 0;
  for (const [mentorId, occurrences] of Object.entries(belowTargetByMentor)) {
    if (occurrences.length >= 3) {
      const latest = occurrences[occurrences.length - 1];
      await prisma.alert.create({
        data: {
          ruleId: belowTargetRule.id,
          mentorId: latest.mentor.id,
          mentorName: latest.mentor.mentorName,
          teamName: latest.mentor.teamName,
          period: latest.periodDate,
          severity: 'CRITICAL',
          message: `${latest.mentor.mentorName} is performing below target threshold (${latest.weightedScore.toFixed(1)}% for ${occurrences.length} consecutive days)`,
          metadata: {
            weightedScore: latest.weightedScore,
            consecutiveDays: occurrences.length,
          },
        },
      });
      triggeredBelowTargetAlerts++;
    }
  }

  // Trigger missing data alerts
  const uniqueMissingDataMentors = Array.from(
    new Set(missingDataMentors.map((m) => m.mentor.id))
  ).map((id) => missingDataMentors.find((m) => m.mentor.id === id)!);

  for (const item of uniqueMissingDataMentors.slice(0, 3)) {
    await prisma.alert.create({
      data: {
        ruleId: missingDataRule.id,
        mentorId: item.mentor.id,
        mentorName: item.mentor.mentorName,
        teamName: item.mentor.teamName,
        period: item.periodDate,
        severity: 'WARNING',
        message: `${item.mentor.mentorName} has missing data for 2+ consecutive days`,
        metadata: {
          lastReportedDate: item.periodDate.toISOString().split('T')[0],
        },
      },
    });
  }

  const totalAlerts = triggeredBelowTargetAlerts + uniqueMissingDataMentors.slice(0, 3).length;
  console.log(`✅ Triggered ${totalAlerts} alerts (${triggeredBelowTargetAlerts} below-target, ${Math.min(3, uniqueMissingDataMentors.length)} missing-data)`);

  console.log('\n✅ Seed complete!\n');
  console.log('📊 Summary:');
  console.log(`   Teams: ${teams.length}`);
  console.log(`   Users: ${1 + leaders.length} (1 admin, ${leaders.length} leaders)`);
  console.log(`   Mentors: ${allMentors.length}`);
  console.log(`   Metrics: ${totalMetrics}`);
  console.log(`   Alert Rules: ${rules.length}`);
  console.log(`   Triggered Alerts: ${totalAlerts}`);
  console.log('\n🔑 Login Credentials:');
  console.log('   Admin:  admin@cmetrics.app / Admin123!');
  console.log('   Kiran:  kiran@cmetrics.app / Leader123! (Team Alpha)');
  console.log('   Aisha:  aisha@cmetrics.app / Leader123! (Team Beta)\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
