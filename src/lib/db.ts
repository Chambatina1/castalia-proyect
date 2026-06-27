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
    await db.$executeRawUnsafe('PRAGMA synchronous=NORMAL')
    await db.$executeRawUnsafe('PRAGMA wal_autocheckpoint=1000')
  } catch {}
}
ensureSafeDB()