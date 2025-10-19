# Migration Test Instructions

## What was fixed:

1. **Removed conflicting migrations**: Deleted all old migration files that were creating duplicate constraints
2. **Created clean baseline**: Generated a single `20241220000000_init` migration from current schema
3. **Fixed Railway config**: Updated Railway.toml to ensure proper migration deployment
4. **Simplified Dockerfile**: Removed conflicting startup commands

## The new migration includes:

- All tables (User, Team, Mentor, MetricDaily, MentorStats, etc.)
- All enums (Role, Status, Severity, etc.)
- All indexes and constraints
- **Properly ordered foreign keys** including `MentorStats_mentorId_fkey`

## For Railway deployment:

1. **Push these changes** to your repository
2. **Deploy to Railway** - the migration will run automatically via:
   ```bash
   npx prisma migrate deploy && npx prisma generate && node dist/index.js
   ```
3. **Check logs** in Railway dashboard to confirm migration success
4. **Test the health endpoint**: `https://your-app.railway.app/healthz`

## If you want to test locally first:

1. Start a local Postgres (Docker or other)
2. Update `server/.env` with your local DATABASE_URL
3. Run: `cd server && npx prisma migrate deploy`
4. Run: `cd server && npm run seed` (optional)
5. Run: `npm run dev` to test the full app

## Migration file location:
`server/prisma/migrations/20241220000000_init/migration.sql`

This single migration file contains the complete schema and will deploy cleanly to Railway without conflicts.