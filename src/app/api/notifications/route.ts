import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/notifications - Get notifications for user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const unread = searchParams.get('unread');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const where: Prisma.NotificationWhereInput = { userId };

    if (unread === 'true') {
      where.isRead = false;
    }

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = await db.notification.count({
      where: { userId, isRead: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, title, message, type, link } = body;

    if (!userId || !title || !message) {
      return NextResponse.json(
        { error: 'userId, title, and message are required' },
        { status: 400 }
      );
    }

    const validTypes = ['INFO', 'WARNING', 'URGENT', 'TASK', 'PHOTO', 'REPORT'];

    const notification = await db.notification.create({
      data: {
        userId,
        title,
        message,
        type: validTypes.includes(type) ? type : 'INFO',
        link: link || null,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}