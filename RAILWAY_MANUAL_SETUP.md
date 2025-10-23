# Railway Manual Database Setup

## Problem: Empty Database ("You have no tables")

If your Railway database is empty after deployment, follow these steps to manually run migrations and seed data.

## Option 1: Use Railway CLI (Recommended)

### Step 1: Install Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Or with Homebrew (Mac)
brew install railway

# Or with Scoop (Windows)
scoop install railway
```

### Step 2: Login to Railway

```bash
railway login
```

This will open a browser window. Authorize the CLI.

### Step 3: Link to Your Project

```bash
# Navigate to your project directory
cd W:\WS\AhmedGabl\Hackathon_CM

# Link to your Railway project
railway link
```

Select your project from the list.

### Step 4: Run Migrations

```bash
# Run migrations in Railway environment
railway run npm run migrate --workspace=server

# If that doesn't work, try:
railway run --service=<your-web-service-name> npm run migrate --workspace=server
```

### Step 5: Seed Database

```bash
# Run seed script
railway run npm run seed --workspace=server

# If that doesn't work, try the production seed:
railway run --service=<your-web-service-name> npm run seed:prod --workspace=server
```

### Step 6: Verify

```bash
# Check if tables were created
railway run --service=postgres-fc9j psql -c "\dt"
```

You should see all your tables listed (User, Team, Mentor, etc.).

## Option 2: Use Railway Dashboard SQL Editor

### Step 1: Get DATABASE_URL

1. Go to Railway dashboard
2. Click on your Postgres service
3. Go to "Variables" tab
4. Find and copy `DATABASE_URL`

### Step 2: Connect with psql

Open a terminal and connect:

```bash
psql "postgresql://user:password@host:port/database"
```

Replace with your actual DATABASE_URL.

### Step 3: Run Migration SQL

Copy the entire contents of:
`server/prisma/migrations/20241220000000_init/migration.sql`

Paste it into the psql prompt and hit Enter.

### Step 4: Verify Tables Created

```sql
\dt
```

You should see all tables listed.

### Step 5: Insert Admin User Manually

```sql
-- Create a team first
INSERT INTO "Team" (id, name, description, "createdAt", "updatedAt")
VALUES ('team-alpha', 'Alpha Squad', 'High-performance course mentoring team', NOW(), NOW());

-- Create admin user (password is: Admin123!)
INSERT INTO "User" (id, email, password, "firstName", "lastName", role, "createdAt", "updatedAt")
VALUES (
  'admin-user-id',
  'admin@cmetrics.app',
  '$2a$10$YourHashedPasswordHere',  -- See below for how to generate
  'Admin',
  'User',
  'SUPER_ADMIN',
  NOW(),
  NOW()
);
```

**To generate the password hash:**

```bash
# On your local machine:
cd server
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('Admin123!', 10))"
```

Copy the output and replace `$2a$10$YourHashedPasswordHere` with it.

## Option 3: Re-deploy with Working Migrations

### Step 1: Verify Environment Variables

In Railway dashboard → Web Service → Variables, ensure:

```bash
DATABASE_URL=<from-postgres-service>  # ✓ Should be set automatically
JWT_SECRET=<your-32-char-secret>       # ✓ Must be set manually
ALLOWED_ORIGINS=*                       # ✓ Must be set manually
NODE_ENV=production                     # ✓ Should be set
```

### Step 2: Check Deployment Logs

1. Go to Railway dashboard
2. Click your web service
3. Click "Deployments" tab
4. Click on the latest deployment
5. Look for these lines:

```
Running migrations...
✅ Migration complete
✅ Prisma Client generated
🌱 Seeding CMetrics database...
✅ Database already seeded (admin user exists). Skipping seed.
   OR
✅ Seed complete!
```

If you see errors, scroll down to "Common Errors" section.

### Step 3: Force Redeploy

If migrations didn't run:

1. Railway dashboard → Web Service → Settings
2. Scroll to "Deploys"
3. Click "Redeploy" button

Watch the logs carefully.

## Option 4: Use Database GUI (TablePlus, DBeaver, etc.)

### Step 1: Get Connection Details

From Railway → Postgres service → Variables:

- `PGHOST`
- `PGPORT`
- `PGUSER`
- `PGPASSWORD`
- `PGDATABASE`

### Step 2: Connect

Use your favorite SQL client (TablePlus, DBeaver, pgAdmin, etc.) with these credentials.

### Step 3: Run Migration SQL

Open `server/prisma/migrations/20241220000000_init/migration.sql` and execute it.

### Step 4: Manually Insert Users

Run the SQL from Option 2, Step 5 to create the admin user.

## Troubleshooting

### Error: "relation \"User\" does not exist"

**Cause:** Migrations haven't run yet.

**Solution:** Follow Option 1 or 2 above.

### Error: "connect ECONNREFUSED"

**Cause:** DATABASE_URL is not set or incorrect.

**Solution:**
1. Go to Railway → Postgres service → Variables
2. Copy `DATABASE_URL`
3. Go to Web service → Variables
4. Add/update `DATABASE_URL`
5. Redeploy

### Error: "prisma command not found"

**Cause:** Prisma isn't installed in production container.

**Solution:** This shouldn't happen with our Dockerfile. If it does:
- Check Dockerfile has `RUN npm install --workspace=server --omit=dev`
- Check server/package.json has `@prisma/client` in `dependencies` (NOT devDependencies)

### Error: "seed.js not found"

**Cause:** Build didn't compile seed script.

**Solution:**
1. Check server/package.json build script includes seed compilation
2. Expected: `"build": "tsc && tsc-alias && tsc prisma/seed.ts ..."`
3. Rebuild locally to verify: `npm run build --workspace=server`
4. Check `server/dist/prisma/seed.js` exists
5. Commit and redeploy

### Migrations Run But No Seed Data

**Cause:** Seed script failed silently.

**Solution:**
Use Railway CLI to manually seed:

```bash
railway link
railway run --service=<your-web-service> npm run seed:prod --workspace=server
```

Or manually insert the admin user using Option 2, Step 5.

## Verify Success

### Test 1: Tables Exist

```bash
railway run --service=postgres-fc9j psql -c "\dt"
```

Should show: User, Team, Mentor, MetricDaily, MentorStats, etc.

### Test 2: Admin User Exists

```bash
railway run --service=postgres-fc9j psql -c "SELECT email, role FROM \"User\" WHERE email = 'admin@cmetrics.app';"
```

Should return:
```
        email         |    role
----------------------+-------------
 admin@cmetrics.app  | SUPER_ADMIN
```

### Test 3: Can Login

1. Go to your Railway app URL
2. Login with: `admin@cmetrics.app` / `Admin123!`
3. Should redirect to Overview page with data

## Quick Reference: Railway CLI Commands

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link project
cd your-project && railway link

# Run migrations
railway run npm run migrate --workspace=server

# Seed database
railway run npm run seed:prod --workspace=server

# Open psql
railway run --service=postgres-fc9j psql

# View logs
railway logs

# Check environment variables
railway variables

# SSH into container (if available)
railway shell
```

## Still Not Working?

### Last Resort: Reset Database

**⚠️ WARNING: This will delete ALL data!**

```bash
# Connect to database
railway run --service=postgres-fc9j psql

# Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# Exit psql
\q

# Run migrations again
railway run npm run migrate --workspace=server

# Seed again
railway run npm run seed:prod --workspace=server
```

## Contact Information

If all else fails:
1. Check Railway deployment logs carefully
2. Check DATABASE_URL is correctly formatted
3. Verify all environment variables are set
4. Try redeploying from scratch
5. Check GitHub repo for latest fixes

---

**Last Updated:** 2025-01-23
