# Railway Deployment Checklist

## ✅ Pre-Deployment Checklist

This checklist ensures your CMetrics app deploys successfully to Railway and authentication works properly.

### 1. Create Railway Services

#### Postgres Database
1. Go to Railway dashboard → New Project
2. Add Postgres database service
3. Copy the `DATABASE_URL` from the Variables tab
   - Format: `postgresql://user:password@host:port/database`

#### Web Service
1. In the same project → Add Service → GitHub Repo
2. Select your repository
3. Railway will auto-detect the Dockerfile

### 2. Configure Environment Variables

Go to Web Service → Variables and set these **required** variables:

```bash
# ⚠️ CRITICAL: Database Connection
DATABASE_URL=postgresql://user:password@host:port/database
# ^ Copy this from your Postgres service

# ⚠️ CRITICAL: JWT Secret (generate a secure random string)
JWT_SECRET=<generate-32-char-random-string-here>
# Generate with: openssl rand -base64 32

# ⚠️ CRITICAL: CORS Configuration
ALLOWED_ORIGINS=*
# Note: In production on Railway, frontend and backend are same-origin
# Setting this to * allows all origins (fine for MVP; restrict later)

# Server Configuration
NODE_ENV=production
PORT=3001

# Upload Settings
MAX_UPLOAD_MB=200
UPLOAD_DIR=./uploads

# Optional: AI Features (if using OpenRouter)
OPENROUTER_API_KEY=<your-openrouter-key>
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Optional: Email (if using meeting invites)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@cmetrics.app
EMAIL_FROM_NAME=CMetrics Platform
```

### 3. Generate Secure JWT Secret

On your local machine, run:
```bash
openssl rand -base64 32
```

Copy the output and set it as `JWT_SECRET` in Railway.

### 4. Deploy

1. Push your code to GitHub (main branch)
2. Railway will automatically build and deploy
3. Monitor the deployment logs:
   - Click on your web service
   - Go to "Deployments" tab
   - Click on the active deployment
   - Watch the build logs

### 5. Verify Deployment

#### Check Build Logs
Look for these success messages:
```
✅ Dependencies installed
✅ Prisma client generated
✅ Server built successfully
✅ Client built successfully
```

#### Check Runtime Logs
After deployment, check the logs for:
```
🌱 Seeding CMetrics database...
✅ Database already seeded (admin user exists). Skipping seed.
   OR
✅ Seed complete!

🚀 CMetrics server running on port 3001
```

#### Test Health Endpoint
```bash
curl https://your-app.up.railway.app/healthz
# Expected: {"status":"healthy","timestamp":"..."}
```

## 🔐 Login to Your App

### Default Credentials (after seed)

1. Navigate to your Railway app URL: `https://your-app.up.railway.app`
2. You should see the login page
3. Use these credentials:

**Super Admin (full access):**
- Email: `admin@cmetrics.app`
- Password: `Admin123!`

**Team Leaders (team-scoped access):**
- Kiran (Alpha Squad): `kiran@cmetrics.app` / `Leader123!`
- Aisha (Beta Force): `aisha@cmetrics.app` / `Leader123!`

### If Login Fails

#### Common Issues & Solutions

**Issue: "Invalid email or password"**
- ✅ Check that seed ran successfully in deployment logs
- ✅ Verify you're using the correct email/password
- ✅ Check DATABASE_URL is correct

**Issue: Cookie not being set**
- ✅ Verify `ALLOWED_ORIGINS` is set to `*` or your Railway URL
- ✅ Check browser console for CORS errors
- ✅ Ensure you're accessing via HTTPS on Railway

**Issue: "Network Error" or CORS error**
- ✅ Set `ALLOWED_ORIGINS=*` in Railway variables
- ✅ Clear browser cookies and cache
- ✅ Try in incognito mode

**Issue: 500 Server Error**
- ✅ Check deployment logs for errors
- ✅ Verify `DATABASE_URL` is correct
- ✅ Ensure migrations ran successfully

## 🔧 Troubleshooting Commands

### Re-run Seed (if needed)
```bash
# In Railway dashboard → Service → Settings → Deploy Triggers
# Click "Redeploy" - the seed is idempotent and won't duplicate data
```

### Check Database Connection
```bash
# SSH into Railway container (if available)
railway run npm run migrate --workspace=server
```

### View Logs
```bash
# Railway dashboard → Service → Deployments → View Logs
# OR use Railway CLI:
railway logs
```

## 🎯 Post-Deployment Tasks

### 1. Verify All Features Work

- ✅ Login with all three demo users
- ✅ Navigate to Overview dashboard
- ✅ Check Mentors list loads
- ✅ View Mentor detail page
- ✅ Check Alerts page
- ✅ Test upload feature (Super Admin only)

### 2. Security Hardening (for production)

```bash
# Update JWT_SECRET to a secure random value
# Restrict ALLOWED_ORIGINS to your domain only:
ALLOWED_ORIGINS=https://your-app.up.railway.app

# Change default passwords after first login
# Consider adding these to user settings:
# - Password change on first login
# - 2FA (future enhancement)
```

### 3. Monitoring Setup

- ✅ Set up Railway Alerts for:
  - Deployment failures
  - High memory usage
  - Database connection errors
- ✅ Monitor error logs daily initially

## 📊 Database Schema Verification

After successful deployment, verify the database has these tables:

```
User, Team, Mentor, MetricDaily, MentorStats, Student
Config, Target, Upload, UploadPreset
AlertRule, Alert
Meeting, MeetingAttendee
```

Check via Railway Postgres service → Data tab, or run:
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
```

## 🚨 Emergency Rollback

If deployment fails catastrophically:

1. Go to Railway → Service → Deployments
2. Find last working deployment
3. Click "..." → Redeploy
4. This will restore the previous version

## 📝 Environment Variables Quick Reference

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | ✅ Yes | - | From Postgres service |
| `JWT_SECRET` | ✅ Yes | (insecure default) | Generate with `openssl rand -base64 32` |
| `ALLOWED_ORIGINS` | ✅ Yes | `*` | Use `*` for Railway (same-origin) |
| `NODE_ENV` | No | `production` | Leave as `production` |
| `PORT` | No | `3001` | Railway auto-assigns |
| `OPENROUTER_API_KEY` | No | - | For AI features |
| `EMAIL_HOST` | No | - | For meeting invites |

## ✅ Success Indicators

Your deployment is successful when:

1. ✅ Build completes without errors
2. ✅ Health endpoint returns `{"status":"healthy"}`
3. ✅ Login page loads at your Railway URL
4. ✅ You can login with `admin@cmetrics.app` / `Admin123!`
5. ✅ Overview dashboard shows sample data (60 days of metrics)
6. ✅ Mentors list shows 54 mentors across 3 teams

## 📞 Getting Help

If you're still having issues:

1. Check Railway deployment logs
2. Check browser console for errors (F12)
3. Verify environment variables are set correctly
4. Try redeploying
5. Check GitHub issues for similar problems

---

**Last Updated:** 2025-01-23
**Version:** 1.0
**Deployment Target:** Railway.app
