# Implementation Plan: PASS 2-7

## PASS 1: Complete ✓

**Deliverables**:
- Full project scaffold (server + client)
- Prisma schema with all models
- Express server with healthz, middleware, error handling
- Upload/Sheets/AI service stubs
- Tailwind + shadcn/ui + design tokens
- React app shell with Overview dashboard (mock data + Recharts)
- Railway deployment files (Dockerfile, Railway.toml)
- Comprehensive documentation (/docs)
- README with exact run/deploy steps

---

## PASS 2: Authentication & Data Layer

**Goals**: Wire up auth system, complete Prisma operations, connect frontend to backend

### Tasks
1. **Auth Routes** (server/src/routes/auth.ts)
   - POST /api/auth/login: Validate credentials, issue JWT cookie
   - POST /api/auth/logout: Clear cookie
   - POST /api/auth/register: Admin creates users (bcrypt passwords)

2. **Auth Context** (client/src/context/AuthContext.tsx)
   - Login/logout functions
   - User state (role, teamId)
   - Protected route wrapper

3. **Agent/Team Routes**
   - GET /api/agents: List with filters (team, status, search)
   - GET /api/agents/:id: Detail with metrics
   - GET /api/teams: List all teams
   - CRUD operations (admin only)

4. **Zod Validation Schemas** (server/src/validation/schemas.ts)
   - Login, agent filters, metric snapshots, target updates

5. **API Client** (client/src/lib/api.ts)
   - Fetch wrapper with cookie auth
   - Error handling, loading states
   - Type-safe request/response

**Acceptance**:
- [ ] Users can log in and see role-based content
- [ ] Leaders only see their team's data
- [ ] Admins see all teams
- [ ] Frontend fetches real data from API

---

## PASS 3: Ingestion & ETL

**Goals**: Complete upload pipeline (Excel + Sheets → Database)

### Tasks
1. **Ingestion Routes** (server/src/routes/ingestion.ts)
   - POST /api/ingestion/upload: Handle multipart/form-data (5 optional files)
   - POST /api/ingestion/sheets: Fetch from Google Sheets

2. **ETL Service** (server/src/services/ingestion.service.ts)
   - Parse Excel with `xlsx` library
   - Map headers (case-insensitive, flexible)
   - Normalize percents, dedupe by (agent_id, period)
   - Upsert MetricSnapshot records
   - Return IngestionReport

3. **Header Validation** (server/src/validation/headers.ts)
   - Check required columns (agent_id, team_name)
   - Map flexible header names to schema fields

4. **Google Sheets Service** (server/src/services/sheets.service.ts)
   - Implement API key / service account auth
   - Fetch spreadsheet data
   - Convert to same format as Excel

5. **Admin Ingestion Page** (client/src/pages/AdminIngestion.tsx)
   - File upload form (5 optional drag-drop zones)
   - Google Sheets form (spreadsheetId, range)
   - Show ingestion report (accepted/rejected counts)

**Acceptance**:
- [ ] Upload Excel files → data appears in dashboards
- [ ] Connect Google Sheets → data syncs
- [ ] Ingestion report shows errors with row numbers
- [ ] Duplicate uploads are handled gracefully

---

## PASS 4: Dashboards & Interactive Features

**Goals**: Complete all dashboard pages with real data, filters, drill-downs

### Tasks
1. **Individuals Page** (client/src/pages/Individuals.tsx)
   - TanStack Table with sorting, filtering, pagination
   - Metric chips, targets hit (0-4), rank column
   - Agent detail modal with charts

2. **Targets Tracker Page** (client/src/pages/TargetsTracker.tsx)
   - Pacing vs actual chart (Area/Line)
   - Target config panel (read-only for leaders)
   - Admin sliders with 100% weight guard

3. **Meeting Alerts Page** (client/src/pages/MeetingAlerts.tsx)
   - Alert table with filters (severity, team, dismissed)
   - Trend mini-chart per agent
   - CSV/PDF export

4. **Target Routes** (server/src/routes/targets.ts)
   - GET /api/targets: Fetch team's target config
   - PUT /api/targets: Update (admin only, validate sum=100%)

5. **Alert Routes** (server/src/routes/alerts.ts)
   - GET /api/alerts: List with filters
   - POST /api/alerts/:id/dismiss: Mark as dismissed
   - POST /api/alerts/rules: Create/edit rules (admin)

6. **Shared Components**
   - KPICard.tsx, StatusChip.tsx, MetricChip.tsx
   - FilterBar.tsx, WeekSelector.tsx
   - Chart wrappers (standardized colors, tooltips)

**Acceptance**:
- [ ] All 4 dashboard pages functional with real data
- [ ] Filters, search, sorting work
- [ ] Drill-downs show detailed views
- [ ] Admins can edit targets/weights
- [ ] CSV export works

---

## PASS 5: AI Integration

**Goals**: Complete OpenRouter integration for coach and help

### Tasks
1. **AI Service Implementation** (server/src/services/ai.service.ts)
   - Implement `callOpenRouter()` with fetch
   - Build system prompts for coach/help
   - Format metrics/targets for context
   - Parse and return AI responses

2. **AI Routes** (server/src/routes/ai.ts)
   - POST /api/ai/coach: Validate input, call service, return response
   - POST /api/ai/help: Load docs, build context, call service

3. **Doc Retrieval** (server/src/services/docs.service.ts)
   - Read /docs/*.md files
   - Basic keyword matching for relevant snippets
   - Return with citations

4. **Help Page** (client/src/pages/Help.tsx)
   - Right-side drawer with chat interface
   - Input field, submit button
   - Display AI response with citations
   - Show "cached" badge if applicable

5. **Coach Integration**
   - Add "Ask AI" button to agent detail modals
   - Pre-fill with agent's metrics
   - Display coaching advice

**Acceptance**:
- [ ] AI coach provides grounded advice based on metrics
- [ ] AI help answers questions with doc citations
- [ ] Responses cached (5 min TTL)
- [ ] Rate limiting enforced
- [ ] No API key exposed to client

---

## PASS 6: Alerts & Background Jobs

**Goals**: Implement alert evaluation logic, periodic processing

### Tasks
1. **Alert Service** (server/src/services/alerts.service.ts)
   - Evaluate rules after ingestion
   - Check: below target, missing data, variance spikes
   - Create Alert records
   - (Future: Send email/Slack notifications)

2. **Metrics Service** (server/src/services/metrics.service.ts)
   - Calculate weighted score
   - Determine status (above/warning/below)
   - Count targets hit
   - Compute paced targets

3. **Background Job** (optional)
   - Cron job or Railway scheduled task
   - Re-evaluate alerts daily
   - Send digest emails

4. **Admin Alert Config Page** (client/src/pages/AdminAlertConfig.tsx)
   - Create/edit alert rules
   - Enable/disable rules
   - Test rules on sample data

**Acceptance**:
- [ ] Alerts trigger based on rules
- [ ] Meeting Alerts page shows active alerts
- [ ] Admins can configure rules
- [ ] Dismissal persists

---

## PASS 7: Polish & Deployment Validation

**Goals**: Final UX polish, accessibility, testing, deploy verification

### Tasks
1. **UI Polish**
   - Loading skeletons for all pages
   - Toast notifications (success, error)
   - Empty states (no data, no results)
   - Consistent spacing, typography

2. **Accessibility Audit**
   - Keyboard navigation test
   - Screen reader compatibility
   - Focus management in modals
   - Color contrast checks

3. **Testing**
   - Unit tests for helpers (pct, status, clamp)
   - Integration tests for auth flow
   - E2E test for full ingestion → dashboard flow

4. **Documentation Updates**
   - Add screenshots to README
   - Create video demo (optional)
   - Update CLAUDE.md with final architecture

5. **Railway Deployment**
   - Push to production
   - Verify healthz endpoint
   - Seed production database
   - Test end-to-end with real Excel files

6. **Performance Optimization**
   - Add database indexes
   - Enable query caching
   - Optimize chart rendering (memoization)
   - Compress static assets

**Acceptance**:
- [ ] All features working in production
- [ ] No console errors/warnings
- [ ] Passes WCAG AA accessibility
- [ ] Test coverage ≥70%
- [ ] Load time <3s on 3G
- [ ] Railway healthz returns 200

---

## Additional Enhancements (Future)

- **Notification System**: Email/Slack alerts
- **Advanced Charts**: Treemap, heatmap, cohort analysis
- **Export Features**: PDF reports with charts
- **Multi-language**: i18n support
- **Mobile App**: React Native wrapper
- **Real-time Updates**: WebSocket for live dashboards
- **Advanced AI**: Multi-turn conversations, proactive insights
- **S3/R2 Storage**: Persistent file uploads
- **Redis Caching**: Faster AI responses, query caching
- **Audit Log**: Track all admin actions

---

## Estimated Timeline

- PASS 2: 2 days
- PASS 3: 2 days
- PASS 4: 3 days
- PASS 5: 2 days
- PASS 6: 1-2 days
- PASS 7: 1-2 days

**Total**: 11-14 days for full production system

---

## Development Order

Follow PASS 2 → 7 sequentially to maintain working state. Each pass delivers incremental value.
