// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha obrigatórios.' }, { status: 400 })
    }

    const admin = await prisma.adminUser.findUnique({
      where: { email },
      include: { pizzaria: true },
    })

    if (!admin) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, admin.password)
    if (!valid) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // Gera JWT com 8h de validade
    const token = await new SignJWT({
      sub: admin.id,
      email: admin.email,
      pizzaria_id: admin.pizzaria_id,
      pizzaria_slug: admin.pizzaria.slug,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .sign(JWT_SECRET)

    const response = NextResponse.json({
      ok: true,
      pizzaria: {
        id: admin.pizzaria.id,
        name: admin.pizzaria.name,
        slug: admin.pizzaria.slug,
      },
    })

    // Cookie httpOnly — não acessível por JS no browser
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8h
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[LOGIN ERROR]', err)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}