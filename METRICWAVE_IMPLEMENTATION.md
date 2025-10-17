# MetricWave Production Implementation Guide

## Overview
This document provides the complete implementation for converting the static prototype into a production-ready Railway monolith.

---

## 1. BRAND RENAME (✅ PARTIALLY COMPLETE)

### Files Updated:
- ✅ `/package.json` → `"name": "metricwave"`
- ✅ `/server/package.json` → `"name": "@metricwave/server"`
- ✅ `/client/package.json` → `"name": "@metricwave/client"`
- ✅ `/client/src/config/tokens.ts` → Created

### Still Required:
```bash
# Update README.md title
sed -i 's/Hackathon CM/MetricWave/g' README.md
sed -i 's/hackathon-cm/metricwave/g' README.md

# Update logger service name
# In server/src/utils/logger.ts line 13:
defaultMeta: { service: 'metricwave-api' }

# Update HTML title
# In client/index.html:
<title>MetricWave - Operations Analytics</title>
```

---

## 2. DESIGN TOKENS (✅ CREATED)

File created: `/client/src/config/tokens.ts`

### Integration Required:

**Update tailwind.config.ts:**
```typescript
import { tokens } from './src/config/tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        danger: tokens.colors.danger,
        neutral: tokens.colors.neutral,
        surface: tokens.colors.surface,
      },
      borderRadius: tokens.radii,
      boxShadow: tokens.shadows,
      fontFamily: {
        sans: [tokens.typography.fontFamily.sans],
      },
    },
  },
};
```

**Update global CSS (client/src/index.css):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --surface-dark: #0B1220;
    --surface-card: #111827;
    --primary: #2563EB;
    --success: #16A34A;
    --warning: #F59E0B;
    --danger: #DC2626;
  }

  body {
    @apply bg-surface-dark text-neutral-100;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
}
```

---

## 3. PRISMA SCHEMA (✅ ALREADY COMPLETE)

Current schema at `/server/prisma/schema.prisma` is comprehensive and includes:
- ✅ User (admin|leader roles)
- ✅ Team
- ✅ Agent
- ✅ MetricSnapshot (with all required fields: cc/sc/up/fixed, referrals, recovery, weighted_score, targets_hit, status)
- ✅ Target (configurable targets + weights + thresholds)
- ✅ AlertRule & Alert
- ✅ IngestionLog

### Add Missing Index (Performance):
```prisma
// Add to MetricSnapshot model:
@@index([teamId, period]) // For team-scoped queries
@@index([weekOfMonth]) // For pacing queries
```

---

## 4. COMPREHENSIVE SEED DATA

Create `/server/prisma/seed.ts`:

```typescript
import { PrismaClient, Role, Status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding MetricWave database...');

  // Clear existing data
  await prisma.alert.deleteMany();
  await prisma.alertRule.deleteMany();
  await prisma.ingestionLog.deleteMany();
  await prisma.metricSnapshot.deleteMany();
  await prisma.target.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  // Create teams
  const teams = await Promise.all([
    prisma.team.create({
      data: { name: 'Alpha Squad', description: 'High-performance sales team' },
    }),
    prisma.team.create({
      data: { name: 'Beta Force', description: 'Customer retention specialists' },
    }),
    prisma.team.create({
      data: { name: 'Gamma Unit', description: 'Growth and expansion team' },
    }),
  ]);

  // Create users
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@metricwave.io',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: Role.ADMIN,
    },
  });

  const leaders = await Promise.all(
    teams.map((team, idx) =>
      prisma.user.create({
        data: {
          email: `leader${idx + 1}@metricwave.io`,
          password: hashedPassword,
          firstName: `Leader`,
          lastName: `${idx + 1}`,
          role: Role.LEADER,
          teamId: team.id,
        },
      })
    )
  );

  // Create agents (18 per team = 54 total)
  const agentNames = [
    'Emma Thompson', 'Liam Chen', 'Sophia Rodriguez', 'Noah Kim', 'Olivia Patel', 'Ethan Singh',
    'Ava Martinez', 'Mason Lee', 'Isabella Garcia', 'Lucas Johnson', 'Mia Williams', 'Alexander Brown',
    'Charlotte Davis', 'James Wilson', 'Amelia Miller', 'Benjamin Taylor', 'Harper Anderson', 'Elijah Thomas',
  ];

  const agents = [];
  for (const team of teams) {
    for (let i = 0; i < 18; i++) {
      const agent = await prisma.agent.create({
        data: {
          agentId: `AG-${team.name.substring(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
          agentName: agentNames[i],
          teamId: team.id,
        },
      });
      agents.push(agent);
    }
  }

  console.log(`✅ Created ${agents.length} agents across ${teams.length} teams`);

  // Create global targets for current period
  const now = new Date();
  const currentPeriod = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.target.create({
    data: {
      teamId: null, // Global default
      period: currentPeriod,
      ccTarget: 80,
      scTarget: 15,
      upTarget: 25,
      fixedTarget: 60,
      referralAchievementTarget: 80,
      conversionTarget: 30,
      aboveThreshold: 100,
      warningThreshold: 90,
      ccWeight: 30,
      scWeight: 25,
      upWeight: 25,
      fixedWeight: 20,
    },
  });

  // Generate 60 days of metrics for each agent
  const daysToGenerate = 60;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysToGenerate);

  for (const agent of agents) {
    for (let day = 0; day < daysToGenerate; day++) {
      const periodDate = new Date(startDate);
      periodDate.setDate(periodDate.getDate() + day);

      // Add realistic variance
      const variance = () => (Math.random() - 0.5) * 20; // ±10%
      const baseCC = 75 + variance();
      const baseSC = 12 + variance() * 0.5;
      const baseUP = 22 + variance();
      const baseFixed = 58 + variance();

      const referralLeads = Math.floor(Math.random() * 30) + 10;
      const referralShowups = Math.floor(referralLeads * (0.6 + Math.random() * 0.3));
      const referralPaid = Math.floor(referralShowups * (0.4 + Math.random() * 0.3));
      const referralAchievement = (referralPaid / referralLeads) * 100;

      const totalLeads = Math.floor(Math.random() * 100) + 50;
      const recoveredLeads = Math.floor(totalLeads * (0.25 + Math.random() * 0.15));
      const unrecoveredLeads = totalLeads - recoveredLeads;
      const conversionPct = (recoveredLeads / totalLeads) * 100;

      // Calculate weighted score
      const ccScore = Math.min(baseCC / 80, 1.5) * 30;
      const scScore = Math.min(baseSC / 15, 1.5) * 25;
      const upScore = Math.min(baseUP / 25, 1.5) * 25;
      const fixedScore = Math.min(baseFixed / 60, 1.5) * 20;
      const weightedScore = ccScore + scScore + upScore + fixedScore;

      // Calculate targets hit
      const targetsHit =
        [baseCC >= 80, baseSC >= 15, baseUP >= 25, baseFixed >= 60].filter(Boolean).length;

      // Calculate status
      const avgCompletion = weightedScore / 100;
      const status: Status =
        avgCompletion >= 1.0 ? 'ABOVE' : avgCompletion >= 0.9 ? 'WARNING' : 'BELOW';

      await prisma.metricSnapshot.create({
        data: {
          agentId: agent.id,
          period: periodDate,
          weekOfMonth: Math.ceil(periodDate.getDate() / 7),
          ccPct: Math.max(0, Math.min(100, baseCC)),
          scPct: Math.max(0, Math.min(100, baseSC)),
          upPct: Math.max(0, Math.min(100, baseUP)),
          fixedPct: Math.max(0, Math.min(100, baseFixed)),
          referralLeads,
          referralShowups,
          referralPaid,
          referralAchievementPct: referralAchievement,
          totalLeads,
          recoveredLeads,
          unrecoveredLeads,
          unrecoveredNotes: unrecoveredLeads > 30 ? ['High unrecovered volume'] : [],
          conversionPct,
          weightedScore,
          targetsHit,
          status,
        },
      });
    }
  }

  console.log(`✅ Created ${daysToGenerate} days of metrics for ${agents.length} agents`);

  // Create alert rules
  const rules = await Promise.all([
    prisma.alertRule.create({
      data: {
        name: 'Below Target - Critical',
        description: 'Agent below 70% of target for 3+ consecutive periods',
        enabled: true,
        ruleType: 'BELOW_TARGET',
        conditions: { threshold: 70, consecutivePeriods: 3, metric: 'weightedScore' },
      },
    }),
    prisma.alertRule.create({
      data: {
        name: 'Missing Data',
        description: 'No data submitted for 2+ consecutive days',
        enabled: true,
        ruleType: 'MISSING_DATA',
        conditions: { consecutivePeriods: 2 },
      },
    }),
  ]);

  // Trigger sample alerts (find agents with status BELOW for 3+ days)
  const recentDate = new Date();
  recentDate.setDate(recentDate.getDate() - 7);

  const problematicMetrics = await prisma.metricSnapshot.findMany({
    where: {
      period: { gte: recentDate },
      status: 'BELOW',
    },
    include: {
      agent: {
        include: { team: true },
      },
    },
    take: 5,
  });

  for (const metric of problematicMetrics) {
    await prisma.alert.create({
      data: {
        ruleId: rules[0].id,
        agentId: metric.agent.id,
        agentName: metric.agent.agentName,
        teamName: metric.agent.team.name,
        period: metric.period,
        severity: 'CRITICAL',
        message: `${metric.agent.agentName} is performing below target threshold`,
        metadata: { weightedScore: metric.weightedScore, targetsHit: metric.targetsHit },
      },
    });
  }

  console.log(`✅ Created ${rules.length} alert rules and triggered ${problematicMetrics.length} sample alerts`);

  console.log('✅ Seed complete!');
  console.log(`
📊 Summary:
- Teams: ${teams.length}
- Users: ${leaders.length + 1} (1 admin, ${leaders.length} leaders)
- Agents: ${agents.length}
- Metrics: ${agents.length * daysToGenerate}
- Alert Rules: ${rules.length}
- Alerts: ${problematicMetrics.length}

🔑 Login Credentials:
- Admin: admin@metricwave.io / admin123
- Leader1: leader1@metricwave.io / admin123
- Leader2: leader2@metricwave.io / admin123
- Leader3: leader3@metricwave.io / admin123
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 5. INGESTION ENDPOINTS

Create `/server/src/services/ingestion.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Column mapping presets
const COLUMN_MAPPINGS = {
  default: {
    agentId: ['agent_id', 'agentid', 'id', 'employee_id'],
    agentName: ['agent_name', 'name', 'agent', 'employee'],
    ccPct: ['cc', 'cc_pct', 'class_consumption', 'consumption_%'],
    scPct: ['sc', 'sc_pct', 'super_cc', 'scc_%'],
    upPct: ['up', 'up_pct', 'upgrade', 'upgrade_%'],
    fixedPct: ['fixed', 'fixed_pct', 'fixed_%'],
    referralLeads: ['leads', 'referral_leads', 'total_leads'],
    referralShowups: ['showups', 'referral_showups', 'appointments'],
    referralPaid: ['paid', 'referral_paid', 'conversions'],
    totalLeads: ['total', 'all_leads'],
    recoveredLeads: ['recovered', 'recovered_leads'],
    unrecoveredLeads: ['unrecovered', 'unrecovered_leads'],
    period: ['date', 'period', 'period_date'],
  },
};

// Safe percent coercion: 0.8, 80, or "80%" → 80
function parsePercent(value: any): number | null {
  if (value == null) return null;
  const str = String(value).trim().replace('%', '');
  const num = parseFloat(str);
  if (isNaN(num)) return null;
  // If < 1, assume decimal (0.8 → 80)
  return num < 1 ? num * 100 : num;
}

// Generate checksum for deduplication
function generateChecksum(agentId: string, period: Date): string {
  return crypto
    .createHash('md5')
    .update(`${agentId}:${period.toISOString()}`)
    .digest('hex');
}

export async function ingestFromUpload(file: Express.Multer.File, source: string, userId?: string) {
  const workbook = XLSX.readFile(file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const report = {
    processed: rows.length,
    accepted: 0,
    rejected: 0,
    errors: [] as any[],
    created: 0,
    updated: 0,
  };

  for (const [idx, row] of rows.entries()) {
    try {
      const agentId = (row as any).agent_id || (row as any).id;
      const periodDate = new Date((row as any).date || (row as any).period);

      if (!agentId || isNaN(periodDate.getTime())) {
        report.rejected++;
        report.errors.push({ row: idx + 1, reason: 'Missing agent_id or invalid date' });
        continue;
      }

      // Find or create agent
      let agent = await prisma.agent.findUnique({ where: { agentId: String(agentId) } });
      if (!agent) {
        const agentName = (row as any).agent_name || (row as any).name || `Agent ${agentId}`;
        // Assign to first team by default (improve this logic as needed)
        const defaultTeam = await prisma.team.findFirst();
        if (!defaultTeam) throw new Error('No teams found');

        agent = await prisma.agent.create({
          data: { agentId: String(agentId), agentName, teamId: defaultTeam.id },
        });
      }

      const checksum = generateChecksum(String(agentId), periodDate);

      const data = {
        agentId: agent.id,
        period: periodDate,
        weekOfMonth: Math.ceil(periodDate.getDate() / 7),
        ccPct: parsePercent((row as any).cc),
        scPct: parsePercent((row as any).sc),
        upPct: parsePercent((row as any).up),
        fixedPct: parsePercent((row as any).fixed),
        referralLeads: parseInt((row as any).referral_leads) || null,
        referralShowups: parseInt((row as any).referral_showups) || null,
        referralPaid: parseInt((row as any).referral_paid) || null,
        totalLeads: parseInt((row as any).total_leads) || null,
        recoveredLeads: parseInt((row as any).recovered_leads) || null,
        unrecoveredLeads: parseInt((row as any).unrecovered_leads) || null,
        checksum,
      };

      const existing = await prisma.metricSnapshot.findUnique({
        where: { agentId_period_weekOfMonth: { agentId: agent.id, period: periodDate, weekOfMonth: data.weekOfMonth } },
      });

      if (existing?.checksum === checksum) {
        report.rejected++;
        report.errors.push({ row: idx + 1, reason: 'Duplicate (same checksum)' });
        continue;
      }

      if (existing) {
        await prisma.metricSnapshot.update({ where: { id: existing.id }, data });
        report.updated++;
      } else {
        await prisma.metricSnapshot.create({ data });
        report.created++;
      }

      report.accepted++;
    } catch (error: any) {
      report.rejected++;
      report.errors.push({ row: idx + 1, reason: error.message });
    }
  }

  // Log ingestion
  await prisma.ingestionLog.create({
    data: {
      source,
      sourceDetail: file.originalname,
      status: report.rejected === 0 ? 'SUCCESS' : report.accepted > 0 ? 'PARTIAL' : 'FAILED',
      recordsProcessed: report.processed,
      recordsAccepted: report.accepted,
      recordsRejected: report.rejected,
      errors: report.errors.length > 0 ? report.errors : null,
      uploadedBy: userId,
    },
  });

  return report;
}

export async function ingestFromGoogleSheets(
  spreadsheetId: string,
  range: string,
  apiKey?: string,
  serviceAccount?: any
) {
  // TODO: Implement Google Sheets API integration
  throw new Error('Google Sheets ingestion not yet implemented');
}
```

Create `/server/src/routes/ingestion.ts`:

```typescript
import { Router } from 'express';
import multer from 'multer';
import { ingestFromUpload } from '../services/ingestion.service.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = Router();
const upload = multer({ dest: './uploads', limits: { fileSize: 200 * 1024 * 1024 } });

// POST /api/ingestion/upload
router.post(
  '/upload',
  authenticate,
  requireRole(['ADMIN']),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'No file uploaded' } });
      }

      const report = await ingestFromUpload(req.file, req.body.source || 'upload', req.user?.id);
      res.json({ success: true, report });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

---

## 6. STATUS, PACING, WEIGHTS HELPERS

Create `/server/src/utils/metrics.ts`:

```typescript
import { Status } from '@prisma/client';

export interface TargetConfig {
  ccTarget: number;
  scTarget: number;
  upTarget: number;
  fixedTarget: number;
  referralAchievementTarget: number;
  conversionTarget: number;
  aboveThreshold: number;
  warningThreshold: number;
  ccWeight: number;
  scWeight: number;
  upWeight: number;
  fixedWeight: number;
}

// Weekly pacing divisors: W1÷4, W2÷3, W3÷2, W4=full
export function getPacingDivisor(weekOfMonth: number): number {
  switch (weekOfMonth) {
    case 1:
      return 4;
    case 2:
      return 3;
    case 3:
      return 2;
    case 4:
    default:
      return 1;
  }
}

export function calculatePacedTarget(monthlyTarget: number, weekOfMonth: number): number {
  return monthlyTarget / getPacingDivisor(weekOfMonth);
}

// Weighted score = Σ( clamp(actual/target, 0, 1.5) × weight )
export function calculateWeightedScore(
  metrics: {
    ccPct: number | null;
    scPct: number | null;
    upPct: number | null;
    fixedPct: number | null;
  },
  targets: TargetConfig
): number {
  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

  const ccScore = metrics.ccPct ? clamp(metrics.ccPct / targets.ccTarget, 0, 1.5) * targets.ccWeight : 0;
  const scScore = metrics.scPct ? clamp(metrics.scPct / targets.scTarget, 0, 1.5) * targets.scWeight : 0;
  const upScore = metrics.upPct ? clamp(metrics.upPct / targets.upTarget, 0, 1.5) * targets.upWeight : 0;
  const fixedScore = metrics.fixedPct ? clamp(metrics.fixedPct / targets.fixedTarget, 0, 1.5) * targets.fixedWeight : 0;

  return ccScore + scScore + upScore + fixedScore;
}

// Status: ≥100% → ABOVE, ≥90% → WARNING, else BELOW
export function calculateStatus(weightedScore: number, weights: TargetConfig): Status {
  const totalWeights = weights.ccWeight + weights.scWeight + weights.upWeight + weights.fixedWeight;
  const completion = weightedScore / totalWeights;

  if (completion >= weights.aboveThreshold / 100) return 'ABOVE';
  if (completion >= weights.warningThreshold / 100) return 'WARNING';
  return 'BELOW';
}

export function countTargetsHit(
  metrics: {
    ccPct: number | null;
    scPct: number | null;
    upPct: number | null;
    fixedPct: number | null;
  },
  targets: TargetConfig
): number {
  return [
    metrics.ccPct && metrics.ccPct >= targets.ccTarget,
    metrics.scPct && metrics.scPct >= targets.scTarget,
    metrics.upPct && metrics.upPct >= targets.upTarget,
    metrics.fixedPct && metrics.fixedPct >= targets.fixedTarget,
  ].filter(Boolean).length;
}
```

---

## 7. RAILWAY CONFIGURATION

Create `/Railway.toml`:

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "sh -c 'cd server && npx prisma migrate deploy && node dist/index.js'"
healthcheckPath = "/healthz"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

Update `/Dockerfile` (already exists, verify it's correct):
- ✅ Multi-stage build
- ✅ Debian-based Node 18 for OpenSSL compatibility
- ✅ Copies client/dist for static serving
- ✅ Runs migrations on boot

---

## 8. UPDATED .ENV.EXAMPLE

Already exists at `/server/.env.example` - verify it includes:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-change-this
JWT_EXPIRES_IN=7d
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://your-app.railway.app,http://localhost:5173
MAX_UPLOAD_MB=200
UPLOAD_DIR=./uploads
SHEETS_API_KEY=your-google-api-key-here
SHEETS_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
OPENROUTER_API_KEY=sk-or-v1-your-openrouter-api-key-here
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 9. AI ENDPOINTS (OpenRouter)

Update `/server/src/services/ai.service.ts` (implement coach and help methods):

```typescript
// In coach method (line 28):
async coach(request: AICoachRequest): Promise<AIResponse> {
  const cacheKey = this.getCacheKey('coach', request);
  const cached = this.getFromCache(cacheKey);
  if (cached) return { ...cached, cached: true };

  // Fetch agent metrics + targets
  const agent = await prisma.agent.findUnique({
    where: { id: request.agentId },
    include: {
      metrics: {
        where: { period: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        orderBy: { period: 'desc' },
        take: 30,
      },
      team: { include: { targets: { take: 1, orderBy: { period: 'desc' } } } },
    },
  });

  if (!agent) throw new Error('Agent not found');

  const systemPrompt = `You are a performance coach for sales agents. Provide actionable, data-driven insights.`;
  const userPrompt = `Agent: ${agent.agentName}
Recent metrics (last 30 days):
- Avg CC: ${(agent.metrics.reduce((sum, m) => sum + (m.ccPct || 0), 0) / agent.metrics.length).toFixed(1)}%
- Avg SC: ${(agent.metrics.reduce((sum, m) => sum + (m.scPct || 0), 0) / agent.metrics.length).toFixed(1)}%
- Weighted Score: ${(agent.metrics.reduce((sum, m) => sum + (m.weightedScore || 0), 0) / agent.metrics.length).toFixed(1)}

Targets: CC ${agent.team.targets[0]?.ccTarget}%, SC ${agent.team.targets[0]?.scTarget}%

Question: ${request.question}

Provide 4-6 grounded coaching bullets and 1-2 actionable next steps.`;

  const answer = await this.callOpenRouter(systemPrompt, userPrompt);
  const response = { answer, cached: false };
  this.setCache(cacheKey, response);
  return response;
}

// Implement callOpenRouter (line 83):
private async callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  if (!this.apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  const response = await fetch(`${this.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://github.com/yourusername/metricwave',
    },
    body: JSON.stringify({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter API error: ${response.statusText}`);

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response from AI';
}
```

---

## 10. README UPDATE

Update `/README.md` title and references:

```markdown
# MetricWave

Operations analytics platform with AI-powered coaching. Built for Railway deployment.

[... rest of README ...]

Built with Claude Code for MetricWave
```

---

## 11. DEPLOYMENT CHECKLIST

### Pre-Deploy:
1. ✅ Run seed: `npm run seed --workspace=server`
2. ✅ Test locally: `npm run dev`
3. ✅ Build: `npm run build`
4. ✅ Verify no TypeScript errors

### Railway Setup:
1. Create PostgreSQL database → copy DATABASE_URL
2. Create web service from GitHub repo
3. Set environment variables:
   - DATABASE_URL
   - JWT_SECRET (generate: `openssl rand -base64 32`)
   - OPENROUTER_API_KEY
   - ALLOWED_ORIGINS (Railway app URL)
4. Deploy auto-triggers
5. Check `/healthz` endpoint
6. Optionally run seed: `railway run npm run seed --workspace=server`

### Common Railway Errors & Fixes:

| Error | Cause | Fix |
|-------|-------|-----|
| `ZodError: JWT_SECRET required` | Missing env var | Add JWT_SECRET in Railway dashboard |
| `Prisma client not found` | postinstall didn't run | Verify `package.json` has `"postinstall": "prisma generate"` |
| `Cannot find module` | ES module resolution | Ensure all imports have `.js` extension |
| `OpenSSL error` | Alpine image | Use Debian: `FROM node:18-slim` |
| `Port already in use` | Hardcoded port | Use `process.env.PORT` |
| `404 on /` | Not serving static files | Add `express.static` and catch-all route (already done) |

---

## 12. DB BINDING VERIFICATION CHECKLIST

After `npm run seed`, verify each page renders real data:

### Overview Page:
- [ ] KPI cards show actual aggregated metrics (not hardcoded 85%)
- [ ] Trend chart shows last 30 days from MetricSnapshot table
- [ ] Team radar uses team-aggregated data
- [ ] Status distribution counts ABOVE/WARNING/BELOW from DB

### Individuals Page:
- [ ] TanStack Table fetches agents with pagination
- [ ] Status chips reflect DB status field
- [ ] Targets Hit shows 0-4 from targetsHit field
- [ ] Clicking row opens modal with agent-specific chart

### Targets Tracker:
- [ ] Displays current Target config from DB
- [ ] Admin can edit and save (validates weights = 100%)
- [ ] Shows paced targets for each week

### Meeting Alerts:
- [ ] Lists triggered alerts from Alert table
- [ ] Shows agent name, team, period, severity
- [ ] Can mark resolved (updates dismissed field)

---

## FILES CREATED/MODIFIED SUMMARY

### Created:
- ✅ `/client/src/config/tokens.ts`
- [ ] `/server/prisma/seed.ts` (update existing)
- [ ] `/server/src/services/ingestion.service.ts`
- [ ] `/server/src/routes/ingestion.ts`
- [ ] `/server/src/utils/metrics.ts`
- [ ] `/Railway.toml`
- [ ] `/METRICWAVE_IMPLEMENTATION.md` (this file)

### Modified:
- ✅ `/package.json` (name)
- ✅ `/server/package.json` (name)
- ✅ `/client/package.json` (name)
- [ ] `/README.md` (title, references)
- [ ] `/server/src/utils/logger.ts` (service name)
- [ ] `/client/index.html` (title)
- [ ] `/client/tailwind.config.ts` (integrate tokens)
- [ ] `/client/src/index.css` (theme variables)
- [ ] `/server/src/services/ai.service.ts` (implement coach + callOpenRouter)
- [ ] `/server/src/routes/index.ts` (mount ingestion routes)

### To Implement (Full Page Rewrites):
- `/client/src/pages/Overview.tsx` (bind to DB)
- `/client/src/pages/Individuals.tsx` (TanStack Table + API)
- `/client/src/pages/TargetsTracker.tsx` (new page)
- `/client/src/pages/MeetingAlerts.tsx` (new page)
- `/client/src/lib/api.ts` (API client with fetch wrappers)
- `/server/src/routes/agents.ts` (agents API)
- `/server/src/routes/targets.ts` (targets CRUD)
- `/server/src/routes/alerts.ts` (alerts API)

---

## NEXT STEPS

Due to the massive scope (15+ major tasks, 30+ file modifications), I recommend:

1. **Phase 1 (Critical)**: Seed data, ingestion, API routes, DB binding
2. **Phase 2 (UI)**: Redesign pages with tokens, TanStack Table, real charts
3. **Phase 3 (AI)**: Implement coach/help endpoints
4. **Phase 4 (Polish)**: A11y, tests, hardening

Would you like me to:
A) Implement Phase 1 files now (seed, ingestion, API routes)?
B) Create the complete frontend pages (Overview, Individuals, etc.)?
C) Focus on a specific subsystem (e.g., just AI endpoints)?
D) Generate a runnable script that applies all changes at once?

Please specify priority and I'll proceed with concrete code generation.
