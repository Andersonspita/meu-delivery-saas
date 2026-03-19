// app/api/admin/pizzaria/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('admin_token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { payload } = await jwtVerify(token, JWT_SECRET)

    const pizzaria = await prisma.pizzaria.findUnique({
      where: { id: payload.pizzaria_id as string },
    })

    if (!pizzaria) return NextResponse.json({ error: 'Pizzaria não encontrada.' }, { status: 404 })

    return NextResponse.json(pizzaria)
  } catch {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }
}