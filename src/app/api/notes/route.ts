import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/notes - Get internal notes for project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId is required' },
        { status: 400 }
      );
    }

    const notes = await db.internalNote.findMany({
      where: { projectId },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
      orderBy: [
        { isPinned: 'desc' },
        { updatedAt: 'desc' },
      ],
    });

    return NextResponse.json({ notes });
  } catch (error) {
    console.error('Get notes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, authorId, content, isPinned } = body;

    if (!projectId || !authorId || !content) {
      return NextResponse.json(
        { error: 'projectId, authorId, and content are required' },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const note = await db.internalNote.create({
      data: {
        projectId,
        authorId,
        content,
        isPinned: isPinned || false,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/notes - Update note (id passed in body)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, content, isPinned } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const existing = await db.internalNote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (content !== undefined) data.content = content;
    if (isPinned !== undefined) data.isPinned = isPinned;

    const note = await db.internalNote.update({
      where: { id },
      data,
      include: {
        author: {
          select: { id: true, name: true, avatar: true, role: true },
        },
      },
    });

    return NextResponse.json({ note });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/notes - Delete note (id passed in body)
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }

    const existing = await db.internalNote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }

    await db.internalNote.delete({ where: { id } });

    return NextResponse.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}