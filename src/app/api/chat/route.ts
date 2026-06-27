import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/chat - Get chat messages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const role = searchParams.get('role');

    const where: Prisma.ChatMessageWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    } else {
      // General managers chat - no project
      where.projectId = null;
    }

    // Filter out internal messages for non-managers
    if (!role || (!role.includes('MANAGER') && role !== 'SUPER_ADMIN')) {
      where.isInternal = false;
    }

    const messages = await db.chatMessage.findMany({
      where,
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        project: projectId
          ? {
              select: { id: true, name: true },
            }
          : false,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get chat messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Send message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      senderId,
      content,
      projectId,
      messageType,
      isInternal,
      mentions,
      fileUrl,
    } = body;

    if (!senderId || !content) {
      return NextResponse.json(
        { error: 'senderId and content are required' },
        { status: 400 }
      );
    }

    const validMessageTypes = ['TEXT', 'IMAGE', 'FILE'];

    const message = await db.chatMessage.create({
      data: {
        senderId,
        content,
        projectId: projectId || null,
        messageType: validMessageTypes.includes(messageType) ? messageType : 'TEXT',
        isInternal: isInternal || false,
        mentions: mentions || null,
        fileUrl: fileUrl || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        project: projectId
          ? {
              select: { id: true, name: true },
            }
          : false,
      },
    });

    // Create notifications for mentioned users
    if (mentions) {
      try {
        const mentionIds: string[] = typeof mentions === 'string' ? JSON.parse(mentions) : mentions;
        for (const userId of mentionIds) {
          await db.notification.create({
            data: {
              userId,
              title: 'You were mentioned',
              message: `${message.sender.name} mentioned you in a chat`,
              type: 'INFO',
              link: projectId ? `/projects/${projectId}` : '/chat',
            },
          });
        }
      } catch {
        // ignore parse errors for mentions
      }
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Send chat message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}