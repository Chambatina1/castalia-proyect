# ══════════════════════════════════════════════════════════════
#  Stage 1 – Install dependencies
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ══════════════════════════════════════════════════════════════
#  Stage 2 – Build + Create initialized database
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

# Create the database with all tables
ENV DATABASE_URL="file:/app/prisma/custom.db"
RUN npx prisma db push --skip-generate --accept-data-loss

# Build the Next.js app
RUN npm run build

# ══════════════════════════════════════════════════════════════
#  Stage 3 – Production runner (minimal, no Prisma CLI needed)
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

# Copy initialized database as template
COPY --from=builder /app/prisma/custom.db /app/template.db

# Persistent data directory for SQLite + uploads
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data /app/template.db

USER nextjs
EXPOSE 10000

# If no DB exists yet, copy from the initialized template
CMD ["sh", "-c", "mkdir -p /data/uploads; if [ ! -f /data/custom.db ]; then cp /app/template.db /data/custom.db && chmod 644 /data/custom.db; fi; node server.js"]