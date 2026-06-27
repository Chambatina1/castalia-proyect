import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const assigneeId = searchParams.get('assigneeId')

    const where: any = {}
    if (projectId) where.projectId = projectId
    if (status && status !== 'ALL') where.status = status
    if (assigneeId) where.assigneeId = assigneeId

    const tasks = await db.task.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true, avatar: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Tasks GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, title, description, priority, dueDate, creatorId, assigneeId } = body
    if (!projectId || !title || !creatorId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const task = await db.task.create({
      data: {
        projectId, title, description, priority: priority || 'MEDIUM',
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId, assigneeId: assigneeId || null,
      },
    })
    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error('Tasks POST error:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}