# Multi-stage Dockerfile for production deployment
# Stage 1: Build server
FROM node:18-slim AS server-builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copy root package.json (defines workspaces)
COPY package.json ./

# Copy server files (needed before install for prisma generate)
COPY server ./server

# Install dependencies (this will trigger prisma generate via postinstall)
RUN npm install --workspace=server --include=dev

# Build server
RUN npm run build --workspace=server

# Stage 2: Build client
FROM node:18-slim AS client-builder

WORKDIR /app

# Copy root package.json (defines workspaces)
COPY package.json ./

# Copy client files
COPY client ./client

# Install dependencies
RUN npm install --workspace=client --include=dev

# Build client
RUN npm run build --workspace=client

# Stage 3: Production image
FROM node:18-slim

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy root package.json (defines workspaces)
COPY package.json ./

# Copy server package.json and prisma files (needed for postinstall)
COPY server/package*.json ./server/
COPY server/prisma ./server/prisma

# Install production dependencies only (this will trigger prisma generate)
RUN npm install --workspace=server --omit=dev \
  && npm install -g prisma@5.20.0

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist

# Copy built client (served as static files)
COPY --from=client-builder /app/client/dist ./client/dist

# Create uploads directory
RUN mkdir -p /app/uploads

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/healthz', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start server. Attempt to resolve any previously failed migrations, then deploy.
# If deploy still fails, fall back to prisma db push so the service can boot.
CMD ["sh", "-c", "cd server \
  && (prisma migrate resolve --rolled-back 20251017_add_mentorstats_relation >/dev/null 2>&1 || true) \
  && (prisma migrate resolve --rolled-back 20251018_add_email_calendly_fields >/dev/null 2>&1 || true) \
  && (prisma migrate deploy || prisma db push) \
  && node dist/index.js"]
