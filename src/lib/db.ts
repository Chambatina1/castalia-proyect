import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const client = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'file:/data/custom.db',
})

export const db = globalForPrisma.prisma ?? client

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Ensure safe journal mode on startup (survives crashes, all files on /data)
async function ensureSafeDB() {
  try {
    await db.$executeRawUnsafe('PRAGMA journal_mode=WAL')
    await db.$executeRawUnsafe('PRAGMA synchronous=FULL')
    await db.$executeRawUnsafe('PRAGMA wal_autocheckpoint=1000')
    // Immediately checkpoint any pending WAL on startup
    await db.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)')
  } catch {}
}
ensureSafeDB()

// Graceful shutdown: checkpoint WAL so no data is lost when Render stops the service
function gracefulShutdown() {
  try {
    db.$executeRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE)').catch(() => {})
    setTimeout(() => process.exit(0), 500)
  } catch {
    process.exit(0)
  }
}
process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)