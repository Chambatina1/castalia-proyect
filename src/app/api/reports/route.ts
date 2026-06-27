import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/reports - List reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');

    const where: Prisma.ReportWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    }

    if (type) {
      where.type = type;
    }

    const reports = await db.report.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true, clientName: true },
        },
        generator: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('List reports error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/reports - Create report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      title,
      type,
      content,
      photos,
      generatedBy,
      status,
    } = body;

    if (!projectId || !title || !generatedBy) {
      return NextResponse.json(
        { error: 'projectId, title, and generatedBy are required' },
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

    const validTypes = ['PROGRESS', 'INSPECTION', 'BEFORE_AFTER', 'INTERNAL', 'CLIENT'];
    const validStatuses = ['DRAFT', 'FINAL', 'SENT'];

    const report = await db.report.create({
      data: {
        projectId,
        title,
        type: validTypes.includes(type) ? type : 'PROGRESS',
        content: typeof content === 'string' ? content : content ? JSON.stringify(content) : null,
        photos: photos ? (typeof photos === 'string' ? photos : JSON.stringify(photos)) : null,
        generatedBy,
        status: validStatuses.includes(status) ? status : 'DRAFT',
      },
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
    await db.activityLog.create({
      data: {
        projectId,
        userId: generatedBy,
        action: 'CREATED',
        entityType: 'REPORT',
        entityId: report.id,
        details: `Generated report: "${title}"`,
      },
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    console.error('Create report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}