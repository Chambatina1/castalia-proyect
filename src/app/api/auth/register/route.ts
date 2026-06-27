import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, phone, position, avatar } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    const validRoles = ['SUPER_ADMIN', 'MANAGER', 'EMPLOYEE', 'CLIENT'];
    const userRole = validRoles.includes(role) ? role : 'EMPLOYEE';

    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: userRole,
        phone: phone || null,
        position: position || null,
        avatar: avatar || null,
      },
    });

    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(
      {
        user: userWithoutPassword,
        token: user.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}