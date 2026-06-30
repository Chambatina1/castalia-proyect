import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/subproducts?projectId=xxx — List subproducts for a project
export async function GET(request: NextRequest) {
  try {
    const projectId = new URL(request.url).searchParams.get('projectId')
    if (!projectId) return NextResponse.json({ error: 'projectId requerido' }, { status: 400 })

    const subProducts = await db.subProduct.findMany({
      where: { projectId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: { select: { photos: true } },
      },
    })

    return NextResponse.json({ subProducts })
  } catch (error) {
    console.error('SubProducts GET error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/subproducts — Create a new subproduct (category)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, name } = body

    if (!projectId || !name?.trim()) {
      return NextResponse.json({ error: 'projectId y name son requeridos' }, { status: 400 })
    }

    // Get next sortOrder
    const maxSort = await db.subProduct.findFirst({
      where: { projectId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const subProduct = await db.subProduct.create({
      data: {
        name: name.trim(),
        projectId,
        sortOrder: (maxSort?.sortOrder ?? -1) + 1,
      },
      include: { _count: { select: { photos: true } } },
    })

    return NextResponse.json({ subProduct }, { status: 201 })
  } catch (error) {
    console.error('SubProducts POST error:', error)
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 })
  }
}

// PATCH /api/subproducts — Rename a subproduct
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name } = body

    if (!id || !name?.trim()) {
      return NextResponse.json({ error: 'id y name son requeridos' }, { status: 400 })
    }

    const subProduct = await db.subProduct.update({
      where: { id },
      data: { name: name.trim() },
      include: { _count: { select: { photos: true } } },
    })

    return NextResponse.json({ subProduct })
  } catch (error: any) {
    console.error('SubProducts PATCH error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Error al renombrar' }, { status: 500 })
  }
}

// DELETE /api/subproducts?id=xxx — Delete a subproduct
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    await db.subProduct.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('SubProducts DELETE error:', error)
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Categoría no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}