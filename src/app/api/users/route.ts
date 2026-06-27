import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/users - List all users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeClients = searchParams.get('includeClients') === 'true';

    const where: Prisma.UserWhereInput = {};

    if (!includeClients) {
      where.role = { not: 'CLIENT' };
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatar: true,
        phone: true,
        position: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            assignedTasks: true,
            createdTasks: true,
            photos: true,
            projectMembers: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}