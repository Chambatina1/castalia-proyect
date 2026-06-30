import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const projects = await db.project.findMany({
      where: { status: { not: 'ARCHIVED' } },
      include: {
        _count: { select: { members: true, photos: true, tasks: true, reports: true } },
        photos: {
          select: { url: true, id: true, thumbnailUrl: true },
          take: 5,
          orderBy: { sortOrder: 'asc' },
        },
        members: {
          include: { user: { select: { id: true, name: true, avatar: true } } },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    const result = projects.map(p => ({
      id: p.id,
      name: p.name,
      clientName: p.clientName,
      address: p.address,
      city: p.city,
      status: p.status,
      priority: p.priority,
      progress: p.progress,
      coverImage: p.coverImage,
      sortOrder: p.sortOrder,
      updatedAt: p.updatedAt,
      createdAt: p.createdAt,
      _count: p._count,
      members: p.members.map(m => ({ userId: m.userId, user: m.user })),
      photos: p.photos.map(ph => ({ url: ph.url, id: ph.id, thumbnailUrl: ph.thumbnailUrl })),
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Projects with photos error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}