// app/api/orders/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      pizzaria_id,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_zone_price,
      payment_method,
      total_amount,
      status,
      order_items_json,
    } = body

    // Validações básicas
    if (!pizzaria_id?.trim())    return NextResponse.json({ error: 'pizzaria_id obrigatório.' }, { status: 400 })
    if (!customer_name?.trim())  return NextResponse.json({ error: 'Nome do cliente obrigatório.' }, { status: 400 })
    if (!customer_phone?.trim()) return NextResponse.json({ error: 'Telefone obrigatório.' }, { status: 400 })
    if (!payment_method?.trim()) return NextResponse.json({ error: 'Forma de pagamento obrigatória.' }, { status: 400 })
    if (!total_amount || isNaN(Number(total_amount))) return NextResponse.json({ error: 'Total inválido.' }, { status: 400 })
    if (!Array.isArray(order_items_json) || order_items_json.length === 0) {
      return NextResponse.json({ error: 'Pedido sem itens.' }, { status: 400 })
    }

    // Verifica se a pizzaria existe e está ativa
    const pizzaria = await prisma.pizzaria.findUnique({
      where: { id: pizzaria_id },
      select: { id: true, active: true, is_open: true },
    })

    if (!pizzaria) return NextResponse.json({ error: 'Estabelecimento não encontrado.' }, { status: 404 })
    if (!pizzaria.active) return NextResponse.json({ error: 'Estabelecimento inativo.' }, { status: 403 })
    if (!pizzaria.is_open) return NextResponse.json({ error: 'Estabelecimento fechado no momento.' }, { status: 403 })

    const order = await prisma.order.create({
      data: {
        pizzaria_id,
        customer_name:       customer_name.trim(),
        customer_phone:      customer_phone.trim(),
        delivery_address:    delivery_address?.trim() || null,
        delivery_zone_price: Number(delivery_zone_price) || 0,
        payment_method:      payment_method.trim(),
        total_amount:        Number(total_amount),
        status:              status || 'pending',
        order_items_json,
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (err) {
    console.error('[ORDER ERROR]', err)
    return NextResponse.json({ error: 'Erro ao registrar pedido.' }, { status: 500 })
  }
}