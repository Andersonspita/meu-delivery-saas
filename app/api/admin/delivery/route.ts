// app/api/admin/delivery/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

async function getPizzariaId(req: NextRequest): Promise<string | null> {
  try {
    const token = req.cookies.get('admin_token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.pizzaria_id as string
  } catch { return null }
}

// GET — lista zonas de entrega
export async function GET(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const zones = await prisma.deliveryZone.findMany({
    where: { pizzaria_id: pizzariaId },
    orderBy: { price: 'asc' },
  })

  return NextResponse.json(zones)
}

// POST — cria zona
export async function POST(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { neighborhood_name, price } = await req.json()

  if (!neighborhood_name?.trim()) {
    return NextResponse.json({ error: 'Nome do bairro obrigatório.' }, { status: 400 })
  }

  const zone = await prisma.deliveryZone.create({
    data: {
      pizzaria_id: pizzariaId,
      neighborhood_name: neighborhood_name.trim(),
      price: Number(price) || 0,
      active: true,
    },
  })

  return NextResponse.json(zone, { status: 201 })
}

// PATCH — atualiza zona (nome, preço ou active)
export async function PATCH(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const { id, ...fields } = body

  const existing = await prisma.deliveryZone.findUnique({ where: { id } })
  if (!existing || existing.pizzaria_id !== pizzariaId) {
    return NextResponse.json({ error: 'Zona não encontrada.' }, { status: 404 })
  }

  const allowed = ['neighborhood_name', 'price', 'active']
  const data: Record<string, any> = {}
  for (const key of allowed) {
    if (key in fields) data[key] = key === 'price' ? Number(fields[key]) : fields[key]
  }

  const updated = await prisma.deliveryZone.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE — exclui zona
export async function DELETE(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const existing = await prisma.deliveryZone.findUnique({ where: { id } })
  if (!existing || existing.pizzaria_id !== pizzariaId) {
    return NextResponse.json({ error: 'Zona não encontrada.' }, { status: 404 })
  }

  await prisma.deliveryZone.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}