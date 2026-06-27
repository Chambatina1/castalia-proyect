import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/photos/[id] - Get photo by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const photo = await db.photo.findUnique({
      where: { id },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        project: {
          select: { id: true, name: true, address: true },
        },
      },
    });

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ photo });
  } catch (error) {
    console.error('Get photo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/photos/[id] - Update photo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.photo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (body.isApproved !== undefined) {
      data.isApproved = body.isApproved;
    }

    if (body.isVisibleToClient !== undefined) {
      data.isVisibleToClient = body.isVisibleToClient;
    }

    if (body.caption !== undefined) {
      data.caption = body.caption;
    }

    if (body.annotations !== undefined) {
      data.annotations = typeof body.annotations === 'string'
        ? body.annotations
        : JSON.stringify(body.annotations);
    }

    if (body.tags !== undefined) {
      // If adding tags, merge with existing
      if (body.addTags) {
        const existingTags = existing.tags
          ? existing.tags.split(',').filter(Boolean)
          : [];
        const newTags = body.tags.split(',').filter(Boolean);
        const merged = [...new Set([...existingTags, ...newTags])];
        data.tags = merged.join(',');
      } else {
        data.tags = body.tags;
      }
    }

    if (body.isUrgent !== undefined) {
      data.isUrgent = body.isUrgent;
    }

    if (body.address !== undefined) {
      data.address = body.address;
    }

    if (body.latitude !== undefined) {
      data.latitude = body.latitude;
    }

    if (body.longitude !== undefined) {
      data.longitude = body.longitude;
    }

    if (body.sortOrder !== undefined) {
      data.sortOrder = body.sortOrder;
    }

    const photo = await db.photo.update({
      where: { id },
      data,
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ photo });
  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/photos/[id] - Delete photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.photo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    await db.photo.delete({ where: { id } });

    // Log activity
    await db.activityLog.create({
      data: {
        projectId: existing.projectId,
        userId: existing.uploadedBy,
        action: 'DELETED',
        entityType: 'PHOTO',
        entityId: id,
        details: 'Deleted a photo',
      },
    });

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}