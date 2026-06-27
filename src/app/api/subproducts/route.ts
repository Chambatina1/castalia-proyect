import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/subproducts?projectId=xxx
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

  const subProducts = await db.subProduct.findMany({
    where: { projectId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { photos: true } } },
  })
  return NextResponse.json({ subProducts })
}

// POST /api/subproducts
export async function POST(req: NextRequest) {
  const { projectId, name, sortOrder } = await req.json()
  if (!projectId || !name?.trim()) return NextResponse.json({ error: 'projectId y nombre requeridos' }, { status: 400 })

  const existing = await db.subProduct.findFirst({ where: { projectId, name: name.trim() } })
  if (existing) return NextResponse.json({ error: 'Ya existe un subproducto con ese nombre' }, { status: 409 })

  const count = await db.subProduct.count({ where: { projectId } })
  const sub = await db.subProduct.create({
    data: { projectId, name: name.trim(), sortOrder: sortOrder ?? count },
  })
  return NextResponse.json({ subProduct: sub }, { status: 201 })
}

// PATCH /api/subproducts (rename + reorder)
export async function PATCH(req: NextRequest) {
  const body = await req.json()

  // Batch reorder
  if (body.items && Array.isArray(body.items)) {
    await Promise.all(
      body.items.map(({ id, sortOrder, name }: { id: string; sortOrder?: number; name?: string }) =>
        db.subProduct.update({ where: { id }, data: { ...(sortOrder !== undefined && { sortOrder }), ...(name && { name: name.trim() }) } })
      )
    )
    return NextResponse.json({ ok: true })
  }

  // Single update
  const { id, name } = body
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  if (name?.trim()) {
    const sub = await db.subProduct.update({ where: { id }, data: { name: name.trim() } })
    return NextResponse.json({ subProduct: sub })
  }
  return NextResponse.json({ error: 'nada que actualizar' }, { status: 400 })
}

// DELETE /api/subproducts?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

  await db.subProduct.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}