// app/api/admin/categories/route.ts
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

// GET — lista categorias com contagem de produtos
export async function GET(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const categories = await prisma.category.findMany({
    where: { pizzaria_id: pizzariaId },
    include: { _count: { select: { products: true } } },
    orderBy: { sort_order: 'asc' },
  })

  return NextResponse.json(categories)
}

// POST — cria categoria
export async function POST(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório.' }, { status: 400 })

  // sort_order = último + 1
  const last = await prisma.category.findFirst({
    where: { pizzaria_id: pizzariaId },
    orderBy: { sort_order: 'desc' },
  })

  const category = await prisma.category.create({
    data: {
      pizzaria_id: pizzariaId,
      name: name.trim(),
      sort_order: (last?.sort_order ?? 0) + 1,
    },
    include: { _count: { select: { products: true } } },
  })

  return NextResponse.json(category, { status: 201 })
}

// PATCH — renomeia categoria OU reordena (array de { id, sort_order })
export async function PATCH(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json()

  // Reorder: recebe array [{ id, sort_order }]
  if (Array.isArray(body)) {
    await Promise.all(
      body.map(({ id, sort_order }: { id: string; sort_order: number }) =>
        prisma.category.update({ where: { id }, data: { sort_order } })
      )
    )
    return NextResponse.json({ ok: true })
  }

  // Rename: recebe { id, name }
  const { id, name } = body
  const existing = await prisma.category.findUnique({ where: { id } })
  if (!existing || existing.pizzaria_id !== pizzariaId) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 })
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { name: name.trim() },
    include: { _count: { select: { products: true } } },
  })

  return NextResponse.json(updated)
}

// DELETE — exclui categoria (só se não tiver produtos)
export async function DELETE(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 })

  const existing = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  })

  if (!existing || existing.pizzaria_id !== pizzariaId) {
    return NextResponse.json({ error: 'Categoria não encontrada.' }, { status: 404 })
  }

  if (existing._count.products > 0) {
    return NextResponse.json(
      { error: `Esta categoria tem ${existing._count.products} produto(s). Mova-os antes de excluir.` },
      { status: 400 }
    )
  }

  await prisma.category.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}