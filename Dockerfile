# ══════════════════════════════════════════════════════════════
#  Stage 1 – Install dependencies
# ══════════════════════════════════════════════════════════════
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ══════════════════════════════════════════════════════════════
#  Stage 2 – Build
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
RUN npm run build

# ══════════════════════════════════════════════════════════════
#  Stage 3 – Production runner
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

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

RUN mkdir -p /data && chown nextjs:nodejs /data

USER nextjs
EXPOSE 10000

CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss 2>/dev/null; node server.js"]