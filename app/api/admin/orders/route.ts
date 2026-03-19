// app/api/admin/orders/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

async function getAdminFromRequest(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch { return null }
}

// GET — lista pedidos da pizzaria
export async function GET(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const pizzariaId = admin.pizzaria_id as string

  const orders = await prisma.order.findMany({
    where: { pizzaria_id: pizzariaId },
    orderBy: { created_at: 'desc' },
  })

  return NextResponse.json(orders)
}

// PATCH — atualiza status + salva timestamp da etapa
export async function PATCH(req: NextRequest) {
  const admin = await getAdminFromRequest(req)
  if (!admin) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { id, status, cancellation_reason } = await req.json()

  const order = await prisma.order.findUnique({
    where: { id },
    include: { pizzaria: true },
  })

  if (!order || order.pizzaria_id !== (admin.pizzaria_id as string)) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  }

  // Monta o campo de timestamp correspondente ao novo status
  const now = new Date()
  const timestampField: Record<string, object> = {
    preparing:  { preparing_at: now },
    delivering: { delivering_at: now },
    delivered:  { delivered_at: now },
    canceled:   { canceled_at: now },
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status,
      ...(timestampField[status] || {}),
      ...(cancellation_reason ? { cancellation_reason } : {}),
    },
    include: { pizzaria: true },
  })

  return NextResponse.json(updated)
}