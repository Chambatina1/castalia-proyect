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
    const { name, creatorId, coverImage } = body

    if (!name || !creatorId) {
      return NextResponse.json({ error: 'Se requiere nombre del proyecto' }, { status: 400 })
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

    await db.projectMember.create({ data: { projectId: project.id, userId: creatorId, role: 'MANAGER' } })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
