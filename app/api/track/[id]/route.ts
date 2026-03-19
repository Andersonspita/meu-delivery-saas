// app/api/track/[id]/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params  // ← await aqui

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        pizzaria: {
          select: {
            name: true,
            logo_url: true,
            primary_color: true,
            whatsapp_number: true,
          },
        },
      },
    })

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (err) {
    console.error('[TRACK ERROR]', err)
    return NextResponse.json({ error: 'Erro ao buscar pedido.' }, { status: 500 })
  }
}