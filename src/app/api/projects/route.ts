import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
      orderBy: { updatedAt: 'desc' },
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

    // If no creatorId, use first available user
    if (!creatorId) {
      const anyUser = await db.user.findFirst({ select: { id: true } })
      if (anyUser) creatorId = anyUser.id
    }

    if (!creatorId) {
      return NextResponse.json({ error: 'No hay usuario disponible' }, { status: 400 })
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