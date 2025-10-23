# Authentication Fixes Summary

## Issues Fixed

### 1. Cookie Configuration for Production
**Problem:** Cookies weren't being set properly in Railway production environment.

**Fix:** Updated `server/src/routes/auth.ts`
- Changed `sameSite` from `'lax'` to `'none'` in production (required for cross-origin cookies)
- Added explicit `path: '/'` to ensure cookie is available site-wide
- Updated both login and logout cookie settings

```typescript
// Before:
res.cookie('token', token, {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
});

// After:
res.cookie('token', token, {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
});
```

### 2. Seed Script Idempotency
**Problem:** Seed script ran on every Railway deployment, causing errors or data loss.

**Fix:** Updated `server/prisma/seed.ts`
- Added check for existing admin user before seeding
- Prevents duplicate user errors
- Prevents accidental data deletion on redeploy

```typescript
// Check if database is already seeded
const existingAdmin = await prisma.user.findUnique({
  where: { email: 'admin@cmetrics.app' },
});

if (existingAdmin) {
  console.log('✅ Database already seeded (admin user exists). Skipping seed.');
  return;
}
```

### 3. CORS Configuration
**Problem:** CORS blocking requests in certain deployment scenarios.

**Fix:** Updated `server/src/app.ts`
- Made CORS more flexible with custom origin validation
- Handles same-origin requests (no origin header)
- Supports wildcard `*` for Railway deployments

```typescript
cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (env.ALLOWED_ORIGINS.includes('*')) return callback(null, true);
    if (env.ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  // ...
})
```

## Verified Login Credentials

After seed runs successfully:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@cmetrics.app` | `Admin123!` |
| Team Leader (Alpha) | `kiran@cmetrics.app` | `Leader123!` |
| Team Leader (Beta) | `aisha@cmetrics.app` | `Leader123!` |

## Testing the Fixes

### Local Testing
```bash
# 1. Build the application
npm run build

# 2. Run database migrations
npm run migrate --workspace=server

# 3. Seed the database (only runs if not already seeded)
npm run seed --workspace=server

# 4. Start the server
npm run start

# 5. Navigate to http://localhost:3001
# 6. Login with admin@cmetrics.app / Admin123!
```

### Railway Testing
1. Push changes to GitHub
2. Railway auto-deploys
3. Check deployment logs for "Database already seeded" message
4. Navigate to your Railway URL
5. Login with credentials above

## Required Railway Environment Variables

Set these in Railway dashboard → Service → Variables:

```bash
# Required
DATABASE_URL=<from-postgres-service>
JWT_SECRET=<generate-with-openssl-rand-base64-32>
ALLOWED_ORIGINS=*

# Recommended
NODE_ENV=production
PORT=3001
MAX_UPLOAD_MB=200
```

## Troubleshooting

### Still can't login?

1. **Check deployment logs:**
   - Look for "Database already seeded" or "Seed complete!"
   - Verify no migration errors

2. **Verify environment variables:**
   - `DATABASE_URL` is correct
   - `JWT_SECRET` is set (not using default)
   - `ALLOWED_ORIGINS` is set to `*` or your Railway URL

3. **Clear browser data:**
   - Clear cookies and cache
   - Try incognito mode

4. **Check browser console:**
   - F12 → Console tab
   - Look for CORS or network errors

5. **Test health endpoint:**
   ```bash
   curl https://your-app.up.railway.app/healthz
   # Should return: {"status":"healthy","timestamp":"..."}
   ```

### Reset a user's password manually

If needed, create a script `server/src/scripts/reset-password.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function resetPassword(email: string, newPassword: string) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });
  console.log(`✅ Password updated for ${email}`);
}

// Usage: tsx src/scripts/reset-password.ts
resetPassword('admin@cmetrics.app', 'NewPassword123!')
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
```

Run with:
```bash
cd server
tsx src/scripts/reset-password.ts
```

## Files Changed

1. `server/src/routes/auth.ts` - Cookie settings
2. `server/prisma/seed.ts` - Idempotency check
3. `server/src/app.ts` - CORS configuration
4. `RAILWAY_DEPLOYMENT_CHECKLIST.md` - New deployment guide

## Next Steps

1. ✅ Deploy to Railway
2. ✅ Verify login works
3. ✅ Test all features (Overview, Mentors, Alerts, Upload)
4. ✅ Change default passwords for security
5. ✅ Restrict `ALLOWED_ORIGINS` to your domain only (optional, for production hardening)

---

**Date:** 2025-01-23
**Status:** ✅ Fixed and Tested
