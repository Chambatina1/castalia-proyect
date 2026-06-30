import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

// Ensure at least one user exists — creates default admin if needed
async function ensureUserExists(): Promise<string> {
  const anyUser = await db.user.findFirst({ select: { id: true } })
  if (anyUser) return anyUser.id

  // No users at all — create default admin
  const hash = await bcrypt.hash('admin123', 10)
  const user = await db.user.create({
    data: {
      email: 'admin@castalia.com',
      password: hash,
      name: 'Admin Castalia',
      role: 'SUPER_ADMIN',
      position: 'Director General',
    },
  })
  console.log('[ensureUserExists] Created default admin:', user.id)
  return user.id
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (priority && priority !== 'ALL') where.priority = priority
    if (search) where.OR = [
      { name: { contains: search } },
      { clientName: { contains: search } },
      { address: { contains: search } },
    ]

    const projects = await db.project.findMany({
      where,
      include: {
        _count: { select: { members: true, photos: true, tasks: true, reports: true } },
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    })

    return NextResponse.json(projects)
  } catch (error) {
    console.error('Projects GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { name, creatorId, coverImage } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Se requiere nombre del proyecto' }, { status: 400 })
    }

    // Resolve a valid creatorId
    if (creatorId) {
      // Verify the user actually exists
      const user = await db.user.findUnique({ where: { id: creatorId }, select: { id: true } })
      if (!user) creatorId = null // stale ID, will fall through to findFirst
    }

    if (!creatorId) {
      // Try to find any existing user
      const anyUser = await db.user.findFirst({ select: { id: true } })
      if (anyUser) {
        creatorId = anyUser.id
      } else {
        // No users at all — create default admin as absolute fallback
        creatorId = await ensureUserExists()
      }
    }

    if (!creatorId) {
      return NextResponse.json({ error: 'No hay usuario disponible. Recarga la app.' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        clientName: name.trim(),
        address: '',
        status: 'ACTIVE',
        priority: 'MEDIUM',
        coverImage: coverImage || null,
        creatorId,
      },
    })

    // Add creator as member (ignore if already exists)
    try {
      await db.projectMember.create({ data: { projectId: project.id, userId: creatorId, role: 'MANAGER' } })
    } catch {
      // Member might already exist, ignore
    }

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}