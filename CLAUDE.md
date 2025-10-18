# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Hackathon_CM** (CMetrics) is a full-stack operations analytics platform for Course Mentor teams. It's a monorepo with Express backend + React frontend designed for Railway deployment.

**Purpose**: Track team performance metrics, provide real-time dashboards, enable data-driven coaching.

**Key Features**: Multi-source ingestion (Excel, Google Sheets), weekly pacing, weighted scoring, RBAC, AI insights via OpenRouter.

**Important**: This is a monorepo using npm workspaces. Root commands (`npm run dev`, `npm run build`) orchestrate both workspaces. Always use workspace-scoped commands (e.g., `npm run migrate --workspace=server`) for workspace-specific tasks.

## Architecture

**Monorepo Structure**: Root with `server/` and `client/` workspaces. Production build serves static React files from Express.

**Backend** (server/):
- Express API with Prisma + Postgres
- JWT cookie auth (HttpOnly, Secure, SameSite) - token stored in `token` cookie (not `auth_token`)
- RBAC: SUPER_ADMIN (full access, upload), ADMIN/LEADER (team-scoped, read-only)
  - SUPER_ADMIN bypass: Always allowed through `requireRole` checks
  - Team scoping: Leaders automatically filtered to their `teamId` in queries
- Services: Upload (multer), Sheets (googleapis), AI (OpenRouter), Ingestion (ETL)
- Middleware: auth (`server/src/middleware/auth.ts`), RBAC (`rbac.ts`), error handler, request logger
- Routes mounted at `/api/*` (see `server/src/routes/index.ts`)

**Frontend** (client/):
- React 18 + Vite, Tailwind CSS, shadcn/ui components (Radix UI)
- TanStack Table (sortable data grids), Recharts (charts)
- Pages: Overview, Mentors (list + detail), Targets Tracker, Meeting Alerts, Upload (SUPER_ADMIN only)
- AuthContext manages user state and protects routes
- API calls via `client/src/lib/api.ts` (uses fetch with credentials)

**Database** (Prisma schema):
- Core Models: User, Team, Mentor (agents), MetricDaily, MentorStats, Student
- Config Models: Config (team-specific targets/weights), Target (period-specific), AlertRule, Alert
- Ingestion: Upload (audit log with checksums)
- Key Indexes: `mentorId + periodDate`, `teamId + periodDate` for fast queries
- Metrics stored as percentages (0-100, not 0-1)
- Daily metrics in MetricDaily; aggregated stats in MentorStats (computed daily)

## Development Commands

```bash
# Install all dependencies (both workspaces)
npm install

# Dev mode (runs both frontend at :5173 and backend at :3001)
npm run dev

# Build for production (builds both workspaces)
npm run build

# Start production server (serves API + React SPA)
npm run start

# Linting and testing
npm run lint              # Lint both workspaces
npm run test              # Run all tests (Vitest on server)

# Database operations
npm run migrate --workspace=server           # Deploy migrations (production)
npm run migrate:dev --workspace=server       # Create and apply migrations (dev)
npm run seed --workspace=server              # Seed database with admin + sample data
npm run generate --workspace=server          # Regenerate Prisma client after schema changes

# FOLDER INGESTION (PRIMARY DATA SOURCE)
npm run ingest:folder                        # Ingest from ./Excel Sheets of What We Will Upload/
npm run ingest:folder --workspace=server     # Alternative form

# Server-only
npm run dev --workspace=server               # http://localhost:3001
npm run build --workspace=server             # Build TypeScript to dist/

# Client-only
npm run dev --workspace=client               # http://localhost:5173
npm run build --workspace=client             # Build React SPA to dist/
npm run preview --workspace=client           # Preview production build
```

**Important Notes**:
- **Primary data source**: `./Excel Sheets of What We Will Upload/` folder - place Excel files here and run `npm run ingest:folder`
- Always run `npm run generate --workspace=server` after changing `prisma/schema.prisma`
- The root `npm run dev` uses `concurrently` to run both servers in parallel
- Migrations auto-run in Docker via `CMD` (uses `prisma migrate deploy`)
- Tests use Vitest (server workspace only; client tests not implemented yet)
- Ingestion reports saved to `./ingestion-reports/<timestamp>.json`

## Key Conventions

**Metrics Format**: Percentages stored as 0-100 (not 0-1). Ingestion service coerces `0.8`, `80`, `"80%"` → `80` via `parsePercent()` in `server/src/services/ingestion.service.ts`.

**Pacing**: Weekly targets = monthly target ÷ [4, 3, 2, 1] for weeks 1-4. See `getPacingDivisor()` in `server/src/utils/metrics.ts`.

**Status Calculation**: Based on weighted score (not individual metrics):
- `ABOVE`: weighted score ≥ 100% of total possible weight
- `WARNING`: weighted score ≥ 90% and < 100%
- `BELOW`: weighted score < 90%

**Weighted Score Formula**: `Σ( clamp(actual/target, 0, 1.5) × weight/100 )`
- Allows 150% max per metric (capped overperformance)
- Weights must sum to 100 (validated in Config)
- Implemented in `calculateWeightedScore()` in `server/src/utils/metrics.ts`

**Targets Hit**: Count of CC/SC/UP/Fixed metrics where `actual ≥ target` (range: 0–4).

**Deduplication**: Metrics deduplicated by `(mentorId, periodDate)` unique constraint. Checksums prevent re-uploading identical files.

**Design Tokens**: Professional palette defined in `client/src/config/design-tokens.ts`:
- Primary: Blue #2563EB
- Success: Green #16A34A
- Warning: Amber #D97706
- Danger: Red #DC2626
- No neon colors or default AI purple/black

**Error Handling**: Custom error classes in `server/src/utils/errors.ts` (AppError, ValidationError, UnauthorizedError, ForbiddenError). Central handler returns `{code, message, requestId}`.

**File Naming**: kebab-case for files (`auth-context.ts`), PascalCase for React components (`MentorDetail.tsx`), camelCase for functions.

## Critical Paths

**Folder-Based Ingestion Flow** (PRIMARY - see `server/src/etl/*` and `server/src/scripts/ingest-folder.ts`):
1. CLI: `npm run ingest:folder` or Admin UI: POST `/api/ingest/folder`
2. Reads all `.xls|.xlsx` files from `./Excel Sheets of What We Will Upload/`
3. **Auto-detect source type** (CC/Fixed/RE/UP/ALL_LEADS/TEAMS) from headers via `detectSourceType()`
4. **Transform** each file using source-specific transformers:
   - `transformCCFile()`: Forward-fill team, parse CC%/SC%, skip totals
   - `transformFixedFile()`: Group by mentor, compute Fixed% = fixed/total × 100
   - `transformUpgradeFile()`: Handle "Cumulative Upgrade Rate" variants
   - `transformReferralFile()`: Parse leads/showups/paid, detect decimal achievement%
   - `transformAllLeadsFile()`: Compute conversion% = recovered/total × 100, parse pipe/comma notes
   - `transformTeamsFile()`: Mentor-to-team mapping (highest priority for team assignment)
5. **Header mapping**: Auto-map via fuzzy matching (40+ variants per field) or use `UploadPreset` from DB
6. **Clean data**: `cleanPercentValue()` handles 0.8|80|"80%"→80, `normalizeName()` uppercases/trims
7. **Merge** multi-source data by `(mentorName, periodDate)` - TEAMS source has priority for team assignment
8. **Validate**: Check ranges (CC/SC/UP 0-200%, Fixed 0-100%), detect negative counts
9. **Persist**: Upsert to `MetricDaily` with deduplication by checksum, create/update `Mentor` and `Team` records
10. **Audit**: Create `Upload` record with status, counts, errors; save JSON report to `./ingestion-reports/<timestamp>.json`
11. **Coverage report**: Show % of records with each metric (CC/SC/UP/Fixed/Referral/Leads)

**Upload-Based Ingestion Flow** (OPTIONAL - see `server/src/services/ingestion.service.ts`):
1. Admin uploads Excel via `/api/ingestion/upload` (multipart/form-data with `cc_file`, `fixed_file`, etc.)
2. Same transform/merge/persist pipeline as folder ingestion
3. Returns `IngestionReport` with row-level errors

**Auth Flow** (`server/src/middleware/auth.ts` + `server/src/routes/auth.ts`):
1. POST `/api/auth/login` with `{email, password}` (plaintext, bcrypt compared server-side)
2. Server validates credentials, issues JWT signed with `JWT_SECRET`
3. JWT stored in `token` cookie (HttpOnly, Secure in prod, SameSite=Strict)
4. Subsequent requests: `authenticate` middleware reads `req.cookies.token`, verifies JWT, attaches `req.user` with `{userId, email, role, teamId}`
5. RBAC middleware (`requireRole`, `requireSuperAdmin`, `requireTeamAccess`) checks `req.user.role` and `teamId`

**Metrics Computation Flow** (triggered by ingestion or daily cron):
1. Raw daily metrics stored in `MetricDaily` (one row per mentor per day)
2. Aggregation service (TODO: implement) computes `MentorStats` by:
   - Grouping students by mentor, calculating distribution (CC buckets, averages)
   - Applying pacing divisor based on week of month
   - Calculating `weightedScore` via `calculateWeightedScore(metrics, targets)`
   - Determining `status` via `calculateStatus(weightedScore, targets)`
   - Counting `targetsHit` (0–4 based on CC/SC/UP/Fixed ≥ 100%)
   - Ranking mentors within team by weighted score
3. Results upserted to `MentorStats` (one row per mentor per day)
4. Dashboards query `MentorStats` for fast reads (no real-time aggregation)

## Testing & Development Data

**Seed Credentials** (created by `npm run seed --workspace=server`):
- SUPER_ADMIN: `admin@example.com` / `admin123` (full access, can upload)
- ADMIN: `leader@example.com` / `leader123` (team-scoped to "Alpha Team")

**Test Data**: Seed script creates 2 teams, 10 mentors, sample MetricDaily records, and basic Config.

**Testing Commands**:
```bash
npm run test                    # Run all tests (Vitest)
npm run test --workspace=server # Server tests only
# Client tests not implemented yet
```

**Manual Testing**:
1. Upload test Excel files (5 optional sources: CC, Fixed, Referral, Upgrade, All Leads)
2. Verify dashboards render charts with real data (not mock data)
3. Check RBAC: Login as leader, verify team filtering works
4. Test ingestion error handling: Upload malformed Excel, check error report

## Deployment

**Target**: Railway with multi-stage Dockerfile (see root `Dockerfile` and `Railway.toml`).

**Build Process**:
1. Install all dependencies (server + client)
2. Generate Prisma client
3. Build server (TypeScript → `dist/`)
4. Build client (React → `client/dist/`)
5. Prune dev dependencies
6. Runtime: Node serves Express API + static React files

**Healthz**: `GET /healthz` returns `{"status":"healthy","timestamp":...}` with Prisma DB check.

**Migrations**: Auto-run on boot via `npx prisma migrate deploy` in Docker CMD (before starting server).

**Environment**: See `server/.env.example` for required vars:
- `DATABASE_URL`: Postgres connection string (Railway auto-provides from Postgres service)
- `JWT_SECRET`: 32+ char random string (generate via `openssl rand -base64 32`)
- `OPENROUTER_API_KEY`: From openrouter.ai (optional; AI features disabled if missing)
- `ALLOWED_ORIGINS`: Comma-separated (e.g., `https://yourapp.up.railway.app,http://localhost:5173`)

**Railway Setup**:
1. Create Postgres service → copy `DATABASE_URL`
2. Create Web service from GitHub repo → Railway auto-detects Dockerfile
3. Set environment variables in Railway dashboard
4. Deploy triggers on push to `main` branch
5. Run `railway run npm run seed --workspace=server` once to create admin user

## Current Implementation Status

**Completed**:
- Full-stack scaffold (Express + React + Prisma)
- Auth system (JWT cookies, login/logout)
- RBAC (SUPER_ADMIN, ADMIN/LEADER with team scoping)
- **Folder-based ingestion system** (PRIMARY):
  - ETL utilities in `server/src/etl/`: cleaners, header-mapping, transformers, merger, persistence
  - CLI script: `npm run ingest:folder` (`server/src/scripts/ingest-folder.ts`)
  - API endpoints: POST `/api/ingest/folder`, GET `/api/ingest/reports`, GET `/api/ingest/reports/:id`
  - Auto-detection of 6 source types: CC, Fixed, RE, UP, ALL_LEADS, TEAMS
  - Fuzzy header matching with 40+ variants per field
  - Multi-source merging by `(mentorName, periodDate)`
  - Validation, deduplication, coverage reporting
  - JSON report generation to `./ingestion-reports/`
- Upload-based ingestion (Excel upload, header mapping, percent coercion, deduplication)
- Prisma schema with 12 models (User, Team, Mentor, MetricDaily, MentorStats, Student, Config, Target, AlertRule, Alert, Upload, UploadPreset)
- Frontend pages: Overview, Mentors (list + detail), Targets Tracker, Meeting Alerts, Upload
- Metrics computation utilities (`calculateWeightedScore`, `calculateStatus`, `getPacingDivisor`)
- Railway deployment files (Dockerfile, Railway.toml)
- Comprehensive documentation (7 docs in `/docs`)

**In Progress / TODO** (check git status for active work):
- Admin Ingestion UI page (button to trigger `/api/ingest/folder`, report viewer)
- Dashboard data binding (replace mock data with API calls)
- Aggregation service to compute MentorStats from MetricDaily
- Google Sheets integration endpoint (`/api/ingestion/sheets`)
- AI coaching endpoints (`/api/ai/coach`, `/api/ai/help`)
- Alert evaluation engine (AlertRule → Alert generation)
- Team export features (CSV downloads)

**Known Issues**:
- Dashboards still use mock data (check `client/src/lib/mock-data.ts` - needs API wiring)
- Student model populated but not yet used in UI
- AI service stubbed but OpenRouter integration needs testing
- Database migration needed for UploadPreset and new MetricDaily fields (run when DB available)

## Common Development Tasks

**Add a new metric**:
1. Update `MetricDaily` model in `server/prisma/schema.prisma` (add column)
2. Run `npm run migrate:dev --workspace=server` (creates migration)
3. Update `ingestion.service.ts`: Add to `DEFAULT_COLUMN_MAPPINGS` and parsing logic
4. Update `metrics.ts`: Extend `MetricValues` interface, add to weighted score calculation if needed
5. Update frontend: Add to chart components in `client/src/pages/`

**Add a new dashboard page**:
1. Create component in `client/src/pages/NewPage.tsx`
2. Add route to `client/src/App.tsx` (wrapped in `<ProtectedRoute>`)
3. Add navigation link to main layout/sidebar
4. Create API endpoint in `server/src/routes/` if new data needed
5. Use Recharts for visualizations, TanStack Table for data grids

**Modify target defaults**:
1. Edit `Config` model defaults in `server/prisma/schema.prisma`
2. Migrate: `npm run migrate:dev --workspace=server`
3. Update existing configs via Prisma script or UI (/targets page)

**Add new alert rule**:
1. Define in `AlertRule` model (may need to extend `AlertRuleType` enum)
2. Implement evaluation logic in `server/src/services/alerts.service.ts`
3. Schedule evaluation (daily cron or post-ingestion trigger)
4. Expose via `/api/alerts/rules` endpoint
5. Display in Meeting Alerts page

**Debug ingestion issues**:
1. Check `Upload` table for recent ingestion logs (status, errors)
2. Review `IngestionReport` returned by endpoint
3. Verify headers match `DEFAULT_COLUMN_MAPPINGS` (case-insensitive)
4. Check `MetricDaily` table for upserted records
5. Test `parsePercent()` and `parseDate()` with sample data

**Add RBAC to new endpoint**:
1. Import `authenticate` from `server/src/middleware/auth.ts`
2. Import `requireRole`, `requireSuperAdmin`, or `requireTeamAccess` from `rbac.ts`
3. Apply middleware: `router.get('/endpoint', authenticate, requireRole('ADMIN'), handler)`
4. For team-scoped queries: Filter by `req.user.teamId` in Prisma query

## Documentation

Detailed technical documentation in `/docs`:
- **Overview.md**: Roles, metrics definitions, targets, pacing system, weights
- **Ingestion.md**: Excel/Sheets upload, header mapping rules, ETL process, error handling
- **TargetsWeights.md**: Target configuration, pacing math examples, weighted score formula
- **Dashboards.md**: Page layouts, chart types, filters, data sources
- **Alerts.md**: Alert rules, severity levels, evaluation workflow
- **AI.md**: Coach and Help endpoints, prompt engineering, rate limits, caching
- **Deployment.md**: Railway setup, environment variables, troubleshooting, health checks
- **Railway-ENV-Setup.md**: Step-by-step Railway environment configuration

## Important Implementation Notes

**Prisma Client Generation**: The server has `postinstall` script that auto-generates Prisma client. If you get "Cannot find module '@prisma/client'", run `npm run generate --workspace=server`.

**CORS & Cookies**:
- Backend CORS configured with `credentials: true` to allow cookie sharing
- Frontend must use `credentials: 'include'` in fetch calls (see `client/src/lib/api.ts`)
- `ALLOWED_ORIGINS` env var must include frontend URL (comma-separated for multiple)

**TypeScript Aliases**: Server uses path aliases (`@/utils`, `@/services`, etc.) via `tsc-alias`. Check `tsconfig.json` paths.

**Production Static Serving**: In production, Express serves React SPA from `client/dist`:
- API routes take precedence (all under `/api/*`)
- Catch-all route `app.get('*', ...)` serves `index.html` for client-side routing
- This means React Router can use BrowserRouter without hashbang URLs

**Database Indexes**: Schema includes strategic indexes on:
- `(mentorId, periodDate)` for fast time-series queries
- `(teamId, periodDate)` for team-scoped dashboards
- `teamId` and `role` for RBAC filtering
- `dismissed, createdAt` for alert queries

**Enum Values**: Prisma enums (Role, Status, Severity, IngestionStatus, AlertRuleType) are uppercase in DB. TypeScript types match exactly. Always use enum values like `Role.SUPER_ADMIN`, not `'super_admin'`.
