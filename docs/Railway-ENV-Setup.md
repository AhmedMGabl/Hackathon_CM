# Railway Environment Variables Setup

Your application is successfully deployed but needs environment variables configured.

## Required Environment Variables

Railway will automatically provide `DATABASE_URL` when you add a PostgreSQL database. You need to manually set these variables:

### 1. JWT_SECRET (Required)
A secure random string for signing JWT tokens (minimum 32 characters).

**Generate one using:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows PowerShell:
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use any secure random string generator
```

**Add to Railway:**
```
JWT_SECRET=<your-generated-secret-here>
```

### 2. ALLOWED_ORIGINS (Required)
Comma-separated list of frontend URLs allowed to access the API.

**Add to Railway:**
```
ALLOWED_ORIGINS=https://your-railway-app.railway.app,http://localhost:5173
```

Replace `your-railway-app.railway.app` with your actual Railway frontend URL once deployed.

### 3. OPENROUTER_API_KEY (Required)
API key for OpenRouter AI features.

**Get your key:**
1. Go to https://openrouter.ai/keys
2. Sign up/login
3. Create a new API key
4. Copy the key (starts with `sk-or-v1-`)

**Add to Railway:**
```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

## Optional Variables

These have defaults but you can override them:

```bash
# Server
NODE_ENV=production
PORT=3001

# JWT
JWT_EXPIRES_IN=7d

# Uploads
MAX_UPLOAD_MB=200
UPLOAD_DIR=./uploads

# Google Sheets (provide one if using Sheets integration)
SHEETS_API_KEY=your-google-api-key
# OR
SHEETS_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# OpenRouter
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## How to Add Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Click on the **Variables** tab
4. Click **+ New Variable**
5. Add each variable name and value
6. Railway will automatically redeploy after you save

## Quick Start (Copy & Paste)

**Minimum required variables for Railway:**

```bash
# Generate JWT_SECRET first using openssl or PowerShell command above
JWT_SECRET=<paste-your-generated-secret>
ALLOWED_ORIGINS=https://your-app.railway.app
OPENROUTER_API_KEY=<your-openrouter-key>
```

## Verification

After adding all variables, Railway will redeploy automatically. Check the deployment logs:
- ✅ Success: You should see "Server started in production mode"
- ❌ Error: Check for any remaining ZodError messages about missing variables

## Security Notes

- **Never commit `.env` files** to version control (already in `.gitignore`)
- JWT_SECRET should be cryptographically random
- Keep your OpenRouter API key secret
- Use HTTPS URLs in ALLOWED_ORIGINS for production

## Local Development

For local development, create a `.env` file in the root directory:

```bash
cp .env.example .env
# Edit .env with your local values
```

The `.env` file is ignored by git and won't be committed.
