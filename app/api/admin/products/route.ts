// app/api/admin/products/route.ts
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

// GET — lista todos os produtos com preços e categoria
export async function GET(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const products = await prisma.product.findMany({
    where: { pizzaria_id: pizzariaId },
    include: {
      product_prices: { orderBy: { price: 'asc' } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(products)
}

// POST — cria produto com preços
export async function POST(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const { name, description, image_url, category_id, is_available, allows_half_half, prices } = body

  if (!name || !category_id) {
    return NextResponse.json({ error: 'Nome e categoria são obrigatórios.' }, { status: 400 })
  }

  const product = await prisma.product.create({
    data: {
      pizzaria_id: pizzariaId,
      category_id,
      name,
      description: description || null,
      image_url: image_url || null,
      is_available: is_available ?? true,
      allows_half_half: allows_half_half ?? false,
      product_prices: {
        create: (prices || []).map((p: { size_name: string; price: number }) => ({
          size_name: p.size_name,
          price: Number(p.price),
        })),
      },
    },
    include: {
      product_prices: true,
      category: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(product, { status: 201 })
}

// PATCH — atualiza produto
export async function PATCH(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()
  const { id, prices, ...fields } = body

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing || existing.pizzaria_id !== pizzariaId) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
  }

  const allowed = ['name', 'description', 'image_url', 'category_id', 'is_available', 'allows_half_half']
  const data: Record<string, any> = {}
  for (const key of allowed) {
    if (key in fields) data[key] = fields[key]
  }

  // Atualiza produto
  await prisma.product.update({ where: { id }, data })

  // Atualiza preços: deleta e recria
  if (prices && Array.isArray(prices)) {
    await prisma.productPrice.deleteMany({ where: { product_id: id } })
    await prisma.productPrice.createMany({
      data: prices.map((p: { size_name: string; price: number }) => ({
        product_id: id,
        size_name: p.size_name,
        price: Number(p.price),
      })),
    })
  }

  const updated = await prisma.product.findUnique({
    where: { id },
    include: {
      product_prices: { orderBy: { price: 'asc' } },
      category: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(updated)
}

// DELETE — exclui produto
export async function DELETE(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing || existing.pizzaria_id !== pizzariaId) {
    return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 })
  }

  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}