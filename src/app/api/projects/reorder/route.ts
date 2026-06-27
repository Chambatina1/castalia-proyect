import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PATCH /api/projects/reorder - Batch update project sort orders
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body; // [{ id: string, sortOrder: number }]

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }

    for (const item of items) {
      await db.project.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder projects error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}