import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { db } from '@/lib/db';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

// Ensure upload directory exists
async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
  };
  return map[mimeType] || 'jpg';
}

// GET /api/photos - List photos with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const tag = searchParams.get('tag');
    const uploadedBy = searchParams.get('uploadedBy');
    const isApproved = searchParams.get('isApproved');

    const where: Record<string, unknown> = {};

    if (projectId) where.projectId = projectId;
    if (tag) where.tags = { contains: tag };
    if (uploadedBy) where.uploadedBy = uploadedBy;
    if (isApproved !== null && isApproved !== undefined && isApproved !== '') {
      where.isApproved = isApproved === 'true';
    }

    const photos = await db.photo.findMany({
      where,
      include: {
        uploader: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('List photos error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/photos - Upload photos (FormData with files)
export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir();

    const contentType = request.headers.get('content-type') || '';

    let projectId: string = '';
    let caption = '';
    let tags = '';
    let isUrgent = 'false';
    let uploadedBy = '';
    const savedUrls: string[] = [];
    const savedPhotos: Record<string, unknown>[] = [];

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData upload (camera + gallery)
      const formData = await request.formData();

      projectId = formData.get('projectId') as string || '';
      const fase = formData.get('fase') as string || '';
      isUrgent = formData.get('isUrgent') as string || 'false';
      uploadedBy = formData.get('uploadedBy') as string || '';

      // Get all file entries
      const files = formData.getAll('files') as File[];

      if (files.length === 0) {
        return NextResponse.json({ error: 'No files provided' }, { status: 400 });
      }

      if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
      }

      // Verify project exists
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const note = (formData.get(`note_${i}`) as string) || '';
        const place = (formData.get(`place_${i}`) as string) || '';

        const ext = getExtension(file.type);
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filepath = join(UPLOAD_DIR, filename);

        const bytes = await file.arrayBuffer();
        await writeFile(filepath, Buffer.from(bytes));

        const url = `/api/photos/serve/${filename}`;
        savedUrls.push(url);

        // Build tags from fase + place
        const tagArr: string[] = [];
        if (fase) tagArr.push(fase);
        if (place) tagArr.push(`local:${place}`);

        // Build caption from note + place
        const parts: string[] = [];
        if (place) parts.push(place);
        if (note) parts.push(note);
        const photoCaption = parts.join(' — ') || null;

        const photo = await db.photo.create({
          data: {
            projectId,
            uploadedBy: uploadedBy || 'system',
            url,
            fileName: file.name || filename,
            fileSize: file.size,
            fileType: file.type.startsWith('image/') ? 'image' : 'video',
            tags: JSON.stringify(tagArr),
            caption: photoCaption,
            isUrgent: isUrgent === 'true',
          },
          include: {
            uploader: { select: { id: true, name: true, avatar: true } },
          },
        });

        savedPhotos.push(photo);
      }

      // Create activity log
      if (savedPhotos.length > 0 && uploadedBy) {
        await db.activityLog.create({
          data: {
            projectId,
            userId: uploadedBy,
            action: 'UPLOADED',
            entityType: 'PHOTO',
            entityId: (savedPhotos[0] as { id: string }).id,
            details: `Uploaded ${savedPhotos.length} photo(s)${caption ? `: "${caption}"` : ''}`,
          },
        });
      }

      return NextResponse.json({ photos: savedPhotos }, { status: 201 });

    } else {
      // Handle JSON upload (legacy)
      const body = await request.json();
      projectId = body.projectId;
      uploadedBy = body.uploadedBy;

      if (!projectId || !uploadedBy) {
        return NextResponse.json({ error: 'projectId and uploadedBy are required' }, { status: 400 });
      }

      const photo = await db.photo.create({
        data: {
          projectId,
          uploadedBy,
          url: body.url || `https://picsum.photos/seed/${Date.now()}/800/600`,
          fileType: body.fileType || 'image',
          fileName: body.fileName || null,
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
          address: body.address || null,
          tags: body.tags || '',
          caption: body.caption || null,
          isUrgent: body.isUrgent || false,
        },
        include: {
          uploader: { select: { id: true, name: true, avatar: true } },
        },
      });

      await db.activityLog.create({
        data: {
          projectId,
          userId: uploadedBy,
          action: 'UPLOADED',
          entityType: 'PHOTO',
          entityId: photo.id,
          details: `Uploaded photo${body.caption ? `: "${body.caption}"` : ''}`,
        },
      });

      return NextResponse.json({ photo }, { status: 201 });
    }
  } catch (error) {
    console.error('Upload photo error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}