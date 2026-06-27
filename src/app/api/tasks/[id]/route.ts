import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/tasks/[id] - Get task by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const task = await db.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true, status: true },
        },
        assignee: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW'];
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      data.title = body.title;
    }

    if (body.description !== undefined) {
      data.description = body.description;
    }

    if (body.status !== undefined && validStatuses.includes(body.status)) {
      data.status = body.status;
      if (body.status === 'COMPLETED') {
        data.completedAt = new Date();
      }
    }

    if (body.priority !== undefined && validPriorities.includes(body.priority)) {
      data.priority = body.priority;
    }

    if (body.dueDate !== undefined) {
      data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    }

    if (body.assigneeId !== undefined) {
      data.assigneeId = body.assigneeId || null;
    }

    if (body.checklist !== undefined) {
      data.checklist = typeof body.checklist === 'string'
        ? body.checklist
        : JSON.stringify(body.checklist);
    }

    const task = await db.task.update({
      where: { id },
      data,
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, avatar: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tasks/[id] - Delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.task.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await db.task.delete({ where: { id } });

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: existing.projectId,
        userId: existing.creatorId,
        action: 'DELETED',
        entityType: 'TASK',
        entityId: id,
        details: `Deleted task: "${existing.title}"`,
      },
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}