// app/api/admin/settings/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

async function getPizzariaId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get('admin_token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.pizzaria_id as string
  } catch {
    return null
  }
}

// GET — busca dados atuais da pizzaria
export async function GET(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const pizzaria = await prisma.pizzaria.findUnique({ where: { id: pizzariaId } })
  if (!pizzaria) return NextResponse.json({ error: 'Não encontrada.' }, { status: 404 })

  return NextResponse.json(pizzaria)
}

// PATCH — atualiza dados da pizzaria (texto)
export async function PATCH(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()

  const allowed = ['name', 'whatsapp_number', 'address', 'primary_color', 'is_open', 'logo_url', 'banner_url']
  const data: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }

  const updated = await prisma.pizzaria.update({
    where: { id: pizzariaId },
    data,
  })

  return NextResponse.json(updated)
}