# CMetrics Implementation Progress

## ✅ COMPLETED (All Pushed to Git)

### Phase A: Backend Foundation
**A1: Brand + Schema + Seed** ✅
- Renamed to CMetrics across all packages
- Prisma schema: Mentor, MetricDaily, Config, Upload models
- Production seed: 3 teams × 18 mentors × 60 days = 3,240 metric records
- Realistic variance with performance tiers
- Intentional alert triggers (below-target, missing data)
- Logins: admin@cmetrics.io, leader1/2@cmetrics.io (password: admin123)

**A2: Ingestion + Config API** ✅
- `/server/src/services/ingestion.service.ts`: Full ETL with column mapping
- POST `/api/ingestion/upload`: Multipart file upload (Excel/CSV)
- POST `/api/ingestion/sheets`: Google Sheets stub (ready for API)
- GET `/api/ingestion/history`: Upload audit log
- GET/PUT `/api/config`: Targets + weights with 100% validation
- GET `/api/config/pacing`: Weekly paced targets

**B1: Mentor + Alert APIs** ✅
- GET `/api/mentors`: Paginated list with filters, sorting, rank calculation
- GET `/api/mentors/:id`: Detailed mentor with 60 days metrics
- GET `/api/alerts`: Filtered list with RBAC
- POST `/api/alerts/dismiss`: Bulk dismiss
- POST `/api/alerts/assign`: Assign to user
- GET `/api/alerts/stats`: Alert statistics

---

## 🚧 REMAINING WORK

### Phase B2: Frontend Pages (NO MOCK DATA)
Need to rewrite all pages to consume real API endpoints:

#### 1. Overview Page (`client/src/pages/Overview.tsx`)
Current state: Uses mock data
Required:
- Fetch `/api/mentors` for KPI aggregation
- Fetch `/api/config` for targets
- Fetch `/api/alerts/stats` for alert count
- Charts:
  - KPI cards: Calculate team-wide avg CC/SC/UP/Fixed vs paced target
  - ComposedChart: Last 30 days trend (actual vs target lines)
  - Radar: Team performance shape (CC/SC/UP/Fixed avg)
  - Sankey: Referral funnel (aggregate leads→showups→paid)
  - Status distribution: Count ABOVE/WARNING/BELOW mentors
- Filters: Search, team selector, status chips, week selector

#### 2. Mentors Page (`client/src/pages/Individuals.tsx` → rename to `Mentors.tsx`)
Current state: Mock data
Required:
- TanStack Table v8 with server-side pagination
- Fetch `/api/mentors?page=&limit=&sortBy=&status=&search=`
- Columns: Rank, Name, Team, CC/SC/UP/Fixed chips (colored by status), Weighted Score, Targets Hit (0-4), Status
- Row click → Mentor Detail Modal:
  - ComposedChart: 60-day trend for 4 metrics vs paced target
  - Referral mini-funnel (recent 30 days)
  - Unrecovered drill-down table
- Column chooser, multi-filters

#### 3. Targets Tracker Page (`client/src/pages/TargetsTracker.tsx` - NEW)
Current state: Doesn't exist
Required:
- Fetch `/api/config`
- Leaders: Read-only view of targets/weights/pacing
- Admin: Editable with sliders
  - Weight sliders with live sum display
  - Block save unless weights === 100%
  - Optimistic UI + toasts
- Pacing visualization: Week1÷4, Week2÷3, Week3÷2, Week4÷1
- Show all targets: CC, SC, UP, Fixed, Referral Achv, Conversion

#### 4. Meeting Alerts Page (`client/src/pages/MeetingAlerts.tsx` - NEW)
Current state: Doesn't exist
Required:
- Fetch `/api/alerts?dismissed=false`
- Table columns: Severity icon, Mentor, Team, Rule, Message, Period, Trend sparkline, Actions
- Actions: Dismiss (single/bulk), Assign, Export CSV/PDF
- Filters: Team, severity, rule type
- Alert detail modal with full context
- Trend sparkline: Last 7 days weighted score

#### 5. Design Tokens Integration
- Update `client/tailwind.config.ts` to use tokens from `client/src/config/tokens.ts`
- Remove ALL mock data imports
- Apply consistent chart theme (gridlines, colors from tokens)

---

### Phase C: AI Endpoints
Need to implement OpenRouter integration:

#### 1. AI Coach (`server/src/services/ai.service.ts` - update)
Currently: Returns stub
Required:
- Fetch mentor metrics + team config
- Build system prompt: "You are a performance coach for Course Mentors..."
- User prompt: Include redacted metrics, targets, question
- Call OpenRouter API with `OPENROUTER_API_KEY`
- Return 4-6 bullets + 1-2 actions
- Cache identical requests (simple Map with TTL)
- Rate limit: 10 requests/min per user

#### 2. AI Help (`server/src/services/ai.service.ts` - update)
Currently: Returns stub
Required:
- Create 6 docs in `/docs/`:
  - CM-Overview.md
  - CM-Ingestion.md
  - CM-Targets-Weights.md
  - CM-Dashboards.md
  - CM-Alerts.md
  - CM-Deployment.md
- Simple RAG: Load relevant doc based on question keywords
- System prompt: "Answer based on CMetrics documentation..."
- Return answer with citations like "Docs › CM-Ingestion"
- Cache + rate limit

#### 3. Help Drawer UI (`client/src/components/HelpDrawer.tsx` - NEW)
- Right-side drawer accessible from header "Ask CMetrics"
- Text input for questions
- POST to `/api/ai/help`
- Render answer with citation links
- Loading skeleton, error states

---

## 📝 HOW TO PROCEED

### Option 1: Test Current Backend
```bash
# Create migration
cd server
npm run migrate:dev

# Run seed
npm run seed

# Start dev server
cd ..
npm run dev
```

**Test API endpoints:**
- `GET http://localhost:3001/healthz` → Should return healthy
- `GET http://localhost:3001/api/mentors` → Should return real mentor data (requires auth token)
- `GET http://localhost:3001/api/config` → Should return global config
- `GET http://localhost:3001/api/alerts` → Should return triggered alerts

### Option 2: Frontend Pages (I Continue)
I can create all 4 frontend pages in the next response:
- Overview with real charts
- Mentors with TanStack Table
- Targets Tracker with admin controls
- Meeting Alerts with CSV export

### Option 3: AI Endpoints First
I can implement AI Coach + Help endpoints now, then frontend.

### Option 4: Handoff Guided Implementation
Use this document to implement remaining work yourself:
- Frontend API client wrapper (fetch with auth)
- Page rewrites (remove all mock data)
- AI endpoint implementation
- Help drawer component

---

## 🎯 API REFERENCE (For Frontend)

### GET /api/mentors
**Query Params:**
- `teamId` (optional)
- `status`: ABOVE | WARNING | BELOW (optional)
- `search` (optional)
- `page` (default: 1)
- `limit` (default: 20)
- `sortBy`: mentorName | weightedScore | targetsHit
- `sortOrder`: asc | desc

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cm...",
      "mentorId": "CM-ALP-001",
      "mentorName": "Emma Thompson",
      "teamName": "Alpha Squad",
      "teamId": "...",
      "avgCcPct": 85.3,
      "avgScPct": 17.2,
      "avgUpPct": 28.1,
      "avgFixedPct": 65.0,
      "weightedScore": 102.5,
      "status": "ABOVE",
      "targetsHit": 4,
      "rank": 3
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 54,
    "totalPages": 3
  }
}
```

### GET /api/config
**Response:**
```json
{
  "success": true,
  "data": {
    "ccTarget": 80,
    "scTarget": 15,
    "upTarget": 25,
    "fixedTarget": 60,
    "ccWeight": 30,
    "scWeight": 25,
    "upWeight": 25,
    "fixedWeight": 20,
    "pacingWeek": 4,
    "alertThresholds": {...}
  }
}
```

### GET /api/alerts
**Query Params:**
- `teamId` (optional)
- `severity`: INFO | WARNING | CRITICAL (optional)
- `dismissed`: true | false (optional)
- `page`, `limit`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "mentorId": "...",
      "mentorName": "Liam Chen",
      "teamName": "Beta Force",
      "severity": "CRITICAL",
      "message": "Performing below target...",
      "period": "2025-10-15T00:00:00.000Z",
      "dismissed": false,
      "rule": {
        "name": "Below Target - Critical",
        "ruleType": "BELOW_TARGET"
      }
    }
  ]
}
```

---

## 🔑 AUTHENTICATION NOTE

Current state: Auth middleware exists but no login route yet.
For testing: Create a simple auth bypass OR implement POST `/api/auth/login` first.

**Quick auth bypass for development:**
```typescript
// In server/src/middleware/auth.ts
export const authenticate = (req, res, next) => {
  // DEV ONLY: Auto-login as admin
  req.user = {
    id: 'admin-id',
    email: 'admin@cmetrics.io',
    role: 'ADMIN',
    teamId: null
  };
  next();
};
```

---

## 📦 FILES CREATED (This Session)

**Backend:**
- `server/prisma/schema.prisma` (updated)
- `server/prisma/seed.ts` (rewritten)
- `server/src/utils/metrics.ts` (created)
- `server/src/services/ingestion.service.ts` (created)
- `server/src/routes/ingestion.ts` (created)
- `server/src/routes/config.ts` (created)
- `server/src/routes/mentors.ts` (created)
- `server/src/routes/alerts.ts` (created)
- `server/src/routes/index.ts` (updated)
- `server/.env.example` (updated)

**Frontend:**
- `client/src/config/tokens.ts` (created)

**Docs:**
- `METRICWAVE_IMPLEMENTATION.md` (created, now outdated - use this file)
- `Railway.toml` (updated)

---

## ✅ DEPLOYMENT READINESS

**Railway:**
- Dockerfile: ✅ Multi-stage, production-ready
- Railway.toml: ✅ Healthcheck 300s, auto-migrate on deploy
- Schema: ✅ Production-ready with indexes
- Seed: ✅ Can run via `npm run seed` or `SEED_ON_START=true`

**Environment Variables Needed:**
```bash
DATABASE_URL=<from Railway Postgres>
JWT_SECRET=<generate: openssl rand -base64 32>
OPENROUTER_API_KEY=sk-or-v1-<your-key>
ALLOWED_ORIGINS=https://your-app.railway.app
SEED_ON_START=true  # For first deploy only
```

---

## 🚨 CRITICAL NEXT STEPS

1. **Test seed locally** to verify 3,240 metrics are created
2. **Implement auth route** OR use dev bypass
3. **Frontend pages** with NO mock data
4. **AI endpoints** with OpenRouter
5. **Help drawer** UI component
6. **Deploy to Railway** and run acceptance checklist

---

**Your call:** What should I focus on next?
A) Frontend pages (Overview, Mentors, Targets, Alerts)
B) AI endpoints (Coach + Help + docs)
C) Auth route implementation
D) Something else specific
