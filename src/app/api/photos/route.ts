import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/photos - List photos with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const tag = searchParams.get('tag');
    const uploadedBy = searchParams.get('uploadedBy');
    const isApproved = searchParams.get('isApproved');
    const isVisibleToClient = searchParams.get('isVisibleToClient');

    const where: Prisma.PhotoWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (tag) {
      where.tags = { contains: tag };
    }

    if (uploadedBy) {
      where.uploadedBy = uploadedBy;
    }

    if (isApproved !== null && isApproved !== undefined && isApproved !== '') {
      where.isApproved = isApproved === 'true';
    }

    if (isVisibleToClient !== null && isVisibleToClient !== undefined && isVisibleToClient !== '') {
      where.isVisibleToClient = isVisibleToClient === 'true';
    }

    const photos = await db.photo.findMany({
      where,
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('List photos error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/photos - Upload photo metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      uploadedBy,
      url,
      fileType,
      fileName,
      latitude,
      longitude,
      address,
      tags,
      caption,
      isUrgent,
    } = body;

    if (!projectId || !uploadedBy) {
      return NextResponse.json(
        { error: 'projectId and uploadedBy are required' },
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

    const photo = await db.photo.create({
      data: {
        projectId,
        uploadedBy,
        url: url || `https://picsum.photos/seed/${Date.now()}/800/600`,
        fileType: fileType || 'image',
        fileName: fileName || null,
        latitude: latitude ?? null,
        longitude: longitude ?? null,
        address: address || null,
        tags: tags || '',
        caption: caption || null,
        isUrgent: isUrgent || false,
      },
      include: {
        uploader: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    // Create activity log entry
    await db.activityLog.create({
      data: {
        projectId,
        userId: uploadedBy,
        action: 'UPLOADED',
        entityType: 'PHOTO',
        entityId: photo.id,
        details: `Uploaded photo${caption ? `: "${caption}"` : ''}${tags ? ` [${tags}]` : ''}`,
      },
    });

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}