import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const projects = await db.project.findMany({
      where: { status: { not: 'ARCHIVED' } },
      include: {
        _count: { select: { members: true, photos: true } },
        photos: {
          select: { url: true, id: true },
          take: 4,
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    const result = projects.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      coverImage: p.coverImage,
      clientName: p.clientName,
      _count: p._count,
      photos: p.photos.map(ph => ({ url: ph.url, id: ph.id })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Projects with photos error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}