# Deployment to Railway

## Prerequisites

- Railway account ([railway.app](https://railway.app))
- Git repository (GitHub, GitLab, or Bitbucket)
- OpenRouter API key ([openrouter.ai](https://openrouter.ai))

## Step 1: Create Postgres Database

1. Log in to Railway
2. Click "New Project"
3. Select "Provision PostgreSQL"
4. Note the connection string (or copy from "Connect" tab)

## Step 2: Create Web Service

1. In the same project, click "New"
2. Select "GitHub Repo" (or deploy from CLI)
3. Choose your repository
4. Railway will auto-detect Dockerfile

## Step 3: Configure Environment Variables

In your web service settings, add these variables:

### Required
```
DATABASE_URL=<paste from Postgres service>
JWT_SECRET=<generate 32+ char random string>
OPENROUTER_API_KEY=<your OpenRouter key>
ALLOWED_ORIGINS=https://your-app-name.up.railway.app
```

### Optional (with defaults)
```
NODE_ENV=production
PORT=3001
JWT_EXPIRES_IN=7d
MAX_UPLOAD_MB=200
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Google Sheets (choose one)
```
SHEETS_API_KEY=<your API key>
# OR
SHEETS_SERVICE_ACCOUNT_JSON=<full JSON string>
```

## Step 4: Deploy

1. Railway will auto-deploy on push to main branch
2. Watch build logs in Railway dashboard
3. Migrations run automatically on boot (`prisma migrate deploy`)
4. Check `/healthz` endpoint to verify

## Step 5: Seed Database (Optional)

Run one-time command in Railway:
```bash
npm run seed --workspace=server
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Leader user: `leader@example.com` / `leader123`
- Sample teams, agents, metrics

## Step 6: Verify Deployment

1. Visit your app URL (e.g., `https://your-app.up.railway.app`)
2. Check `/healthz` returns `{"status":"healthy"}`
3. Log in with seed credentials
4. Verify Overview page loads with charts

## Troubleshooting

### Build fails
- Check Dockerfile syntax
- Ensure all dependencies in package.json
- Verify node version ≥18

### Database connection fails
- Confirm `DATABASE_URL` is correct
- Check Postgres service is running
- Verify firewall/network settings

### Migrations fail
- Check Prisma schema syntax
- Ensure `prisma` is in dependencies
- View logs: `railway logs`

### Health check fails
- Verify port 3001 is exposed
- Check server starts without errors
- Ensure `/healthz` route exists

## Environment Variable Security

- Never commit `.env` to git
- Use Railway's secrets management
- Rotate `JWT_SECRET` periodically
- Restrict `SHEETS_API_KEY` to specific IPs if possible

## Custom Domain (Optional)

1. In Railway service settings, go to "Domains"
2. Add custom domain
3. Update DNS records as instructed
4. Update `ALLOWED_ORIGINS` to include new domain

## Scaling

Railway auto-scales based on usage. For high traffic:
- Monitor resource usage in dashboard
- Consider upgrading plan
- Add caching layer (Redis) for AI responses

## Monitoring

- Use Railway metrics (CPU, memory, requests)
- Check logs: `railway logs --tail`
- Set up alerts for health check failures

## Backup

- Railway automatically backs up Postgres
- Export data periodically: `pg_dump`
- Store uploads to S3/CloudFlare R2 (future enhancement)

## Rolling Back

If deployment fails:
1. Go to "Deployments" tab
2. Click "..." on previous deployment
3. Select "Redeploy"

## CI/CD

Railway auto-deploys on git push. To disable:
1. Service settings → "Deploy"
2. Toggle "Auto Deploy"

## Cost Estimate

- Hobby plan: Free (500 hours/month)
- Pro plan: ~$5-20/month (depends on usage)
- Postgres: ~$5/month for starter tier
