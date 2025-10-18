# Operations Analytics Platform

Full-stack monolith for team performance analytics with AI-powered coaching. Built for Railway deployment.

## Features

- **Real-time Dashboards**: KPIs, trends, rankings, alerts with Recharts
- **Multi-source Ingestion**: Excel (.xlsx/.xls) web uploads + optional folder/Google Sheets
- **Production Web Upload**: Drag-and-drop Excel upload from browser with auto-detection
- **Flexible Targets**: Weekly pacing, weighted scoring, configurable thresholds
- **AI Coaching**: OpenRouter-powered insights and help (server-side only)
- **RBAC**: Admin (full access) and Team Leader (team-scoped) roles
- **Production-Ready**: Docker, healthz endpoint, migrations, seed data

## Tech Stack

**Frontend**: React 18, Vite, Tailwind, shadcn/ui, TanStack Table, Recharts
**Backend**: Node 18, Express, Prisma, Postgres, Zod validation
**AI**: OpenRouter (Claude 3.5 Sonnet)
**Deploy**: Railway with multi-stage Dockerfile
**Auth**: JWT cookies, HttpOnly/Secure

## Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Setup environment files
cp server/.env.example server/.env
cp client/.env.example client/.env

# Edit server/.env with:
# - DATABASE_URL (Postgres connection string)
# - JWT_SECRET (32+ char random string)
# - OPENROUTER_API_KEY
# - SHEETS_API_KEY (optional)

# Run database migrations
npm run migrate --workspace=server

# Seed database (creates admin + sample data)
npm run seed --workspace=server

# Start development servers (both run in parallel)
npm run dev

# Frontend: http://localhost:5173
# Backend: http://localhost:3001
# Health check: http://localhost:3001/healthz
```

### Login Credentials (After Seed)

- **Admin**: `admin@example.com` / `admin123`
- **Leader**: `leader@example.com` / `leader123`

## Project Structure

```
Hackathon_CM/
├── server/             # Express API
│   ├── src/
│   │   ├── index.ts            # Server entry
│   │   ├── app.ts              # Express setup
│   │   ├── config/             # Env, constants, defaults
│   │   ├── middleware/         # Auth, RBAC, error handling
│   │   ├── routes/             # API endpoints
│   │   ├── services/           # Business logic (AI, uploads, Sheets)
│   │   ├── utils/              # Helpers, errors, logger
│   │   └── types/              # TypeScript types
│   └── prisma/
│       ├── schema.prisma       # Data model
│       └── seed.ts             # Sample data
├── client/             # React app
│   ├── src/
│   │   ├── main.tsx            # React entry
│   │   ├── App.tsx             # Router + layout
│   │   ├── pages/              # Dashboard pages
│   │   ├── components/         # Reusable components
│   │   ├── lib/                # Utils, API client, mock data
│   │   └── config/             # Design tokens
│   └── index.html
├── docs/               # Detailed documentation
│   ├── Overview.md
│   ├── Ingestion.md
│   ├── TargetsWeights.md
│   ├── Dashboards.md
│   ├── Alerts.md
│   ├── AI.md
│   └── Deployment.md
├── Dockerfile          # Multi-stage production build
├── Railway.toml        # Railway config
└── README.md           # This file
```

## Deployment to Railway

### Prerequisites
- Railway account ([railway.app](https://railway.app))
- Git repository (GitHub, GitLab, Bitbucket)
- OpenRouter API key ([openrouter.ai](https://openrouter.ai))

### Steps

1. **Create Postgres Database**
   - New Project → Provision PostgreSQL
   - Copy `DATABASE_URL` from "Connect" tab

2. **Create Web Service**
   - Same project → New → GitHub Repo
   - Select your repo (Railway auto-detects Dockerfile)

3. **Configure Environment Variables**
   ```
   DATABASE_URL=<from Postgres service>
   JWT_SECRET=<generate 32+ char string>
   OPENROUTER_API_KEY=<your key>
   ALLOWED_ORIGINS=https://your-app.up.railway.app
   ```

4. **Deploy**
   - Railway auto-deploys on push to main
   - Migrations run on boot
   - Check `/healthz` to verify

5. **Seed Database** (one-time)
   ```bash
   railway run npm run seed --workspace=server
   ```

See **[docs/Deployment.md](docs/Deployment.md)** for detailed steps and troubleshooting.

## Production Uploads

### Web Upload (Primary Method - Production)

The recommended way to upload data in production is through the Admin Ingestion UI:

1. **Access the Upload Page**
   - Login as Admin: `https://your-app.up.railway.app/admin/ingestion`
   - Or navigate: Dashboard → Admin → Ingestion

2. **Upload Files**
   - Drag & drop or click to select Excel files
   - Any subset of 5 sources (all optional):
     - **Class Consumption (CC/SC%)**: `cc_file`
     - **Fixed Rate**: `fixed_file`
     - **Referral Funnel**: `re_file`
     - **Upgrade Rate**: `up_file`
     - **All Leads & Recovery**: `all_leads_file`
   - Max file size: **200MB** per file
   - Allowed formats: `.xlsx`, `.xls`

3. **Process**
   - Click "Upload & Process"
   - Files are auto-detected by headers
   - Data is merged, validated, and persisted
   - View detailed ingestion report

4. **Verify**
   - Click "View Overview" or "View Mentors" to see updated data
   - Targets, pacing, and weighted scores are applied automatically

### API Upload (Programmatic)

Upload files via API from scripts or CI/CD:

```bash
# Example: Upload multiple sources
curl -X POST "https://your-app.up.railway.app/api/ingest/uploads" \
  -H "Cookie: token=<your-jwt-token>" \
  -F "cc_file=@./CCtest.xlsx" \
  -F "re_file=@./1410Leads.xlsx" \
  -F "up_file=@./UpgradeRate.xlsx" \
  -F "fixed_file=@./FixedTest.xlsx" \
  -F "all_leads_file=@./AllLeads.xlsx"

# Response: IngestionReport JSON with totals, coverage, errors
```

**Notes**:
- Requires authentication (JWT cookie)
- Files processed in-memory (no temp files)
- Auto-detects source type from headers
- Returns detailed report with per-source breakdown

### Local Development (Folder Mode)

For local testing, you can also use folder-based ingestion:

```bash
# 1. Place Excel files in folder
./Excel Sheets of What We Will Upload/
  ├── CCtest.xlsx
  ├── FTtest.xlsx
  ├── UpgradeRate.xlsx
  └── ... (any Excel files)

# 2. Run CLI ingestion
npm run ingest:folder

# 3. View JSON report
./ingestion-reports/ingestion-<timestamp>.json
```

**Folder mode is for local dev only** - not available in production/Railway deployments.

## Available Scripts

### Root
- `npm run dev` - Start both frontend and backend in parallel
- `npm run build` - Build both for production
- `npm run start` - Start production server
- `npm run lint` - Lint all workspaces
- `npm run test` - Run all tests
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database

### Server
- `npm run dev --workspace=server` - Start API in dev mode
- `npm run build --workspace=server` - Build API for production
- `npm run generate --workspace=server` - Generate Prisma client

### Client
- `npm run dev --workspace=client` - Start frontend dev server
- `npm run build --workspace=client` - Build frontend for production
- `npm run preview --workspace=client` - Preview production build

## Documentation

- **[Overview.md](docs/Overview.md)**: Roles, metrics, targets, pacing, weights
- **[Ingestion.md](docs/Ingestion.md)**: Excel/Sheets upload, header mapping, ETL
- **[TargetsWeights.md](docs/TargetsWeights.md)**: Target config, pacing math, status logic
- **[Dashboards.md](docs/Dashboards.md)**: Page layouts, chart types, filters
- **[Alerts.md](docs/Alerts.md)**: Alert rules, severity levels, workflow
- **[AI.md](docs/AI.md)**: Coach and Help endpoints, prompts, rate limits
- **[Deployment.md](docs/Deployment.md)**: Railway setup, env vars, troubleshooting

## API Endpoints (Stubs for PASS 2)

```
GET    /healthz                        # Health check
POST   /api/auth/login                 # Login (JWT cookie)
POST   /api/auth/logout                # Logout
GET    /api/agents                     # List agents (filtered)
GET    /api/agents/:id                 # Agent detail
GET    /api/teams                      # List teams
GET    /api/targets                    # Get target config
PUT    /api/targets                    # Update targets (admin)
GET    /api/alerts                     # List alerts (filtered)
POST   /api/ingestion/upload           # Upload Excel files
POST   /api/ingestion/sheets           # Ingest from Google Sheets
POST   /api/ai/coach                   # AI coaching
POST   /api/ai/help                    # AI help
```

## Environment Variables

### Server (Required)
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/db"
JWT_SECRET="your-secret-min-32-chars"
OPENROUTER_API_KEY="your-openrouter-key"
ALLOWED_ORIGINS="http://localhost:5173"
```

### Server (Optional)
```bash
NODE_ENV="development"
PORT="3001"
JWT_EXPIRES_IN="7d"
MAX_UPLOAD_MB="200"
SHEETS_API_KEY=""                      # OR SHEETS_SERVICE_ACCOUNT_JSON
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"
OPENROUTER_BASE_URL="https://openrouter.ai/api/v1"
RATE_LIMIT_WINDOW_MS="900000"
RATE_LIMIT_MAX_REQUESTS="100"
```

### Client
```bash
VITE_API_URL="http://localhost:3001"
```

## Design Tokens

Professional palette (no default AI purple/black):
- **Primary**: Blue (#2563EB)
- **Success**: Green (#16A34A)
- **Warning**: Amber (#D97706)
- **Danger**: Red (#DC2626)
- **Neutral**: Slate (50-900)

All colors meet WCAG AA contrast. Light and dark themes included.

## Security Features

- HttpOnly/Secure/SameSite cookies
- CORS with origin whitelist
- File upload size/MIME validation
- Zod schema validation on all inputs
- Role-based access control (RBAC)
- Team-scoped queries for leaders
- Server-side AI (no client key exposure)
- Rate limiting on AI and upload endpoints

## Accessibility

- Keyboard navigation
- ARIA labels on interactive elements
- Focus rings (visible)
- Color contrast ≥4.5:1 (WCAG AA)
- Responsive (mobile, tablet, desktop)

## Testing

```bash
# Run all tests
npm run test

# Server tests (Vitest)
npm run test --workspace=server

# Client tests (future)
npm run test --workspace=client
```

## Troubleshooting

### Port conflicts
- Frontend runs on 5173, backend on 3001
- Change in `vite.config.ts` or `server/src/config/env.ts`

### Database connection errors
- Verify `DATABASE_URL` format
- Ensure Postgres is running
- Check firewall settings

### Prisma client not found
- Run `npm run generate --workspace=server`
- Rebuild after schema changes

### Build fails on Railway
- Check Node version (≥18)
- Verify all dependencies in package.json
- Review build logs: `railway logs`

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature/my-feature`
5. Open pull request

## License

MIT

## Support

- Documentation: [docs/](docs/)
- Issues: [GitHub Issues](https://github.com/yourusername/hackathon-cm/issues)
- Help page in app (AI-powered Q&A)

---

Built with Claude Code for Hackathon CM
