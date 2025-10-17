# Multi-stage Dockerfile for production deployment
# Stage 1: Build server
FROM node:18-alpine AS server-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY server/package*.json ./server/

# Install dependencies
RUN npm install --workspace=server --include=dev

# Copy server source
COPY server ./server

# Generate Prisma client
RUN npm run generate --workspace=server

# Build server
RUN npm run build --workspace=server

# Stage 2: Build client
FROM node:18-alpine AS client-builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY client/package*.json ./client/

# Install dependencies
RUN npm install --workspace=client --include=dev

# Copy client source
COPY client ./client

# Build client
RUN npm run build --workspace=client

# Stage 3: Production image
FROM node:18-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install --workspace=server --omit=dev

# Copy built server
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=server-builder /app/server/node_modules/.prisma ./server/node_modules/.prisma

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

# Start server (migrations run on boot)
CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node dist/index.js"]
