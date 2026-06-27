import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (projectId) where.projectId = projectId

    const logs = await db.activityLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, avatar: true } },
        project: projectId ? undefined : { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Activity GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}