import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/projects/[id] - Get project by ID with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        creator: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, role: true, email: true, phone: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
        photos: {
          select: { id: true, url: true, thumbnailUrl: true, tags: true, isApproved: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        tasks: {
          include: {
            assignee: {
              select: { id: true, name: true, avatar: true },
            },
            creator: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        reports: {
          select: { id: true, title: true, type: true, status: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'desc' },
        },
        activityLogs: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        internalNotes: {
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: [
            { isPinned: 'desc' },
            { updatedAt: 'desc' },
          ],
        },
        _count: {
          select: {
            photos: true,
            tasks: true,
            members: true,
            chatMessages: true,
            reports: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const validStatuses = ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    const data: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'clientName', 'clientEmail', 'address', 'city',
      'state', 'zipCode', 'latitude', 'longitude', 'description',
      'priority', 'progress', 'coverImage',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    if (body.status !== undefined && validStatuses.includes(body.status)) {
      data.status = body.status;
      if (body.status === 'COMPLETED') {
        data.completedAt = new Date();
        data.progress = 100;
      }
    }

    if (body.startDate !== undefined) {
      data.startDate = body.startDate ? new Date(body.startDate) : null;
    }
    if (body.estimatedEnd !== undefined) {
      data.estimatedEnd = body.estimatedEnd ? new Date(body.estimatedEnd) : null;
    }

    const project = await db.project.update({
      where: { id },
      data,
      include: {
        creator: {
          select: { id: true, name: true, avatar: true },
        },
        _count: {
          select: {
            members: true,
            photos: true,
            tasks: true,
          },
        },
      },
    });

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Permanently delete project and all related data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Cascade deletes: members, photos, tasks, chatMessages, reports, activityLogs, internalNotes, clientShares
    await db.project.delete({ where: { id } });

    return NextResponse.json({
      message: 'Proyecto eliminado correctamente',
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}