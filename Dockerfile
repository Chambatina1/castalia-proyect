# ══════════════════════════════════════════════════════════════
#  Stage 1 – Install dependencies
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ══════════════════════════════════════════════════════════════
#  Stage 2 – Build + Create initialized database template
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY prisma ./prisma/
COPY package.json package-lock.json ./
RUN npx prisma generate

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Create a FRESH template DB (only used on very first deploy ever)
ENV DATABASE_URL="file:/app/prisma/custom.db"
RUN npx prisma db push --skip-generate --accept-data-loss

# Build the Next.js app
RUN npm run build

# ══════════════════════════════════════════════════════════════
#  Stage 3 – Production runner
#  ALL persistent data lives on /data (persistent disk):
#    /data/custom.db        ← SQLite database
#    /data/custom.db-wal    ← WAL journal (survives crashes)
#    /data/custom.db-shm    ← shared memory index
#    /data/uploads/         ← uploaded photos
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/custom.db"
ENV PORT=10000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output + static assets + public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy initialized database as ONE-TIME template (only used if /data is empty)
COPY --from=builder /app/prisma/custom.db /app/template.db

# Give nextjs user ownership of template
RUN chown nextjs:nodejs /app/template.db

USER nextjs
EXPOSE 10000

# ══════════════════════════════════════════════════════════════
#  STARTUP RULES — data safety guarantees:
#  1. mkdir -p /data/uploads  → photos folder always exists
#  2. if no DB file exists     → copy template (FIRST TIME ONLY)
#  3. if DB file EXISTS        → DO NOTHING (preserves all data)
#  4. NEVER drops, resets, or overwrites existing data
# ══════════════════════════════════════════════════════════════
CMD ["sh", "-c", "\
  mkdir -p /data/uploads && \
  if [ ! -f /data/custom.db ]; then \
    cp /app/template.db /data/custom.db && chmod 644 /data/custom.db; \
  fi && \
  node server.js"]