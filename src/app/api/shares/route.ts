import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

// GET /api/shares - List client shares
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const where: Record<string, unknown> = {};
    if (projectId) {
      where.projectId = projectId;
    }

    const shares = await db.clientShare.findMany({
      where: where as never,
      include: {
        project: {
          select: { id: true, name: true, clientName: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ shares });
  } catch (error) {
    console.error('List shares error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/shares - Create share link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      createdBy,
      clientEmail,
      clientName,
      password,
      expiresAt,
      allowedPhotos,
      allowedReports,
    } = body;

    if (!projectId || !createdBy) {
      return NextResponse.json(
        { error: 'projectId and createdBy are required' },
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

    const token = uuidv4();

    const share = await db.clientShare.create({
      data: {
        projectId,
        createdBy,
        clientEmail: clientEmail || null,
        clientName: clientName || null,
        token,
        password: password || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        allowedPhotos: allowedPhotos ? (typeof allowedPhotos === 'string' ? allowedPhotos : JSON.stringify(allowedPhotos)) : null,
        allowedReports: allowedReports ? (typeof allowedReports === 'string' ? allowedReports : JSON.stringify(allowedReports)) : null,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        creator: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    console.error('Create share error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}