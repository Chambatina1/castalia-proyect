import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads'

async function ensureUploadDir() {
  if (!existsSync(UPLOAD_DIR)) await mkdir(UPLOAD_DIR, { recursive: true })
}

function getExtension(mimeType: string): string {
  const map: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif' }
  return map[mimeType] || 'jpg'
}

// GET /api/upload-token?token=xxx — Validate token, return project info + categories
export async function GET(request: NextRequest) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    const share = await db.clientShare.findUnique({
      where: { token },
      include: { project: { select: { id: true, name: true } } },
    })

    if (!share || !share.isActive) {
      return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 404 })
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
    }

    // Fetch categories (subproducts) for this project
    const subProducts = await db.subProduct.findMany({
      where: { projectId: share.project.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { photos: true } } },
    })

    return NextResponse.json({
      projectId: share.project.id,
      projectName: share.project.name,
      clientName: share.clientName,
      categories: subProducts.map(sp => ({
        id: sp.id,
        name: sp.name,
        photoCount: sp._count.photos,
      })),
    })
  } catch (error) {
    console.error('Upload token validate error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/upload-token — Upload photos using share token (no auth required)
export async function POST(request: NextRequest) {
  try {
    await ensureUploadDir()

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Se requiere FormData' }, { status: 400 })
    }

    const formData = await request.formData()
    const token = formData.get('token') as string
    const fase = (formData.get('fase') as string) || ''
    const subProductId = (formData.get('subProductId') as string) || null

    if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 400 })

    // Validate token
    const share = await db.clientShare.findUnique({
      where: { token },
      include: { project: { select: { id: true, name: true } } },
    })

    if (!share || !share.isActive) {
      return NextResponse.json({ error: 'Link inválido' }, { status: 404 })
    }

    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 410 })
    }

    // If subProductId provided, verify it belongs to this project
    if (subProductId) {
      const sub = await db.subProduct.findFirst({ where: { id: subProductId, projectId: share.project.id } })
      if (!sub) return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 400 })
    }

    const projectId = share.project.id
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No se recibieron archivos' }, { status: 400 })
    }

    // Get or create a "worker" user for unauthenticated uploads
    let workerId = share.createdBy
    const workerName = formData.get('workerName') as string
    if (workerName) {
      let worker = await db.user.findFirst({ where: { email: `worker-${share.id}@castalia.com` } })
      if (!worker) {
        worker = await db.user.create({
          data: { email: `worker-${share.id}@castalia.com`, password: 'none', name: workerName, role: 'EMPLOYEE' },
        })
      }
      workerId = worker.id
    }

    // Get subProduct name for Dropbox
    let subProductName = 'General'
    if (subProductId) {
      const sp = await db.subProduct.findUnique({ where: { id: subProductId }, select: { name: true } })
      if (sp) subProductName = sp.name
    }

    const savedPhotos: Record<string, unknown>[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = getExtension(file.type)
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const filepath = join(UPLOAD_DIR, filename)

      const bytes = await file.arrayBuffer()
      await writeFile(filepath, Buffer.from(bytes))

      const url = `/api/photos/serve/${filename}`
      const tags = fase ? JSON.stringify([fase]) : '[]'

      const photo = await db.photo.create({
        data: {
          projectId,
          uploadedBy: workerId,
          url,
          fileName: file.name || filename,
          fileSize: file.size,
          fileType: file.type.startsWith('image/') ? 'image' : 'video',
          tags,
          caption: fase === 'antes' ? 'Fase: Antes' : fase === 'despues' ? 'Fase: Después' : null,
          ...(subProductId && { subProductId }),
        },
      })

      savedPhotos.push(photo)

      // Fire-and-forget: sync to Dropbox if connected
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      fetch(`${appUrl}/api/dropbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upload-photo', photoId: photo.id, projectId, fase, subProductName }),
      }).catch(() => {})
    }

    // Update last accessed
    await db.clientShare.update({ where: { id: share.id }, data: { lastAccessed: new Date() } })

    // Activity log
    if (savedPhotos.length > 0) {
      await db.activityLog.create({
        data: {
          projectId,
          userId: workerId,
          action: 'UPLOADED',
          entityType: 'PHOTO',
          entityId: (savedPhotos[0] as { id: string }).id,
          details: `Trabajador subió ${savedPhotos.length} foto(s) — ${fase || 'sin fase'} — ${subProductName}`,
        },
      })
    }

    return NextResponse.json({ photos: savedPhotos, count: savedPhotos.length }, { status: 201 })
  } catch (error) {
    console.error('Upload token error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}