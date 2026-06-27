import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password } = body
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    const user = await db.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const valid = bcrypt.compareSync(password, user.password)
    if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    const { password: _, ...safeUser } = user
    return NextResponse.json({ user: safeUser, token: user.id })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
