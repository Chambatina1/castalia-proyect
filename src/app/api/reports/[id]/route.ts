import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/reports/[id] - Get report by ID with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const report = await db.report.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, name: true, avatar: true },
                },
              },
            },
          },
        },
        generator: {
          select: { id: true, name: true, avatar: true, email: true },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    // Parse photos array to fetch actual photo objects if IDs exist
    let photoObjects = [];
    if (report.photos) {
      try {
        const photoIds: string[] = JSON.parse(report.photos);
        photoObjects = await db.photo.findMany({
          where: { id: { in: photoIds } },
          select: { id: true, url: true, thumbnailUrl: true, caption: true, tags: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        });
      } catch {
        // If photos can't be parsed, leave empty
      }
    }

    return NextResponse.json({
      report: {
        ...report,
        photoObjects,
      },
    });
  } catch (error) {
    console.error('Get report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/reports/[id] - Update report status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    const validStatuses = ['DRAFT', 'FINAL', 'SENT'];
    const statusFlow: Record<string, string[]> = {
      'DRAFT': ['FINAL'],
      'FINAL': ['SENT'],
      'SENT': [],
    };

    const data: Record<string, unknown> = {};

    if (body.status !== undefined && validStatuses.includes(body.status)) {
      // Validate status transition
      if (!statusFlow[existing.status]?.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status transition from ${existing.status} to ${body.status}. Valid transitions: ${statusFlow[existing.status]?.join(', ') || 'none'}` },
          { status: 400 }
        );
      }
      data.status = body.status;

      if (body.status === 'SENT' && body.sentToEmail) {
        data.sentToEmail = body.sentToEmail;
      }
      if (body.status === 'SENT' && body.shareLink) {
        data.shareLink = body.shareLink;
      }
    }

    if (body.title !== undefined) {
      data.title = body.title;
    }

    if (body.content !== undefined) {
      data.content = typeof body.content === 'string'
        ? body.content
        : JSON.stringify(body.content);
    }

    if (body.photos !== undefined) {
      data.photos = typeof body.photos === 'string'
        ? body.photos
        : JSON.stringify(body.photos);
    }

    const report = await db.report.update({
      where: { id },
      data,
      include: {
        project: {
          select: { id: true, name: true, clientName: true },
        },
        generator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Log activity
    if (body.status) {
      await db.activityLog.create({
        data: {
          projectId: existing.projectId,
          userId: existing.generatedBy,
          action: 'STATUS_CHANGED',
          entityType: 'REPORT',
          entityId: id,
          details: `Report "${existing.title}" status changed to ${body.status}`,
        },
      });
    }

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id] - Delete report
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.report.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Report not found' },
        { status: 404 }
      );
    }

    await db.report.delete({ where: { id } });

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: existing.projectId,
        userId: existing.generatedBy,
        action: 'DELETED',
        entityType: 'REPORT',
        entityId: id,
        details: `Deleted report: "${existing.title}"`,
      },
    });

    return NextResponse.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}