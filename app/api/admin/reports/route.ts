// app/api/admin/reports/route.ts
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

export async function GET(req: NextRequest) {
  const pizzariaId = await getPizzariaId(req)
  if (!pizzariaId) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '7d'

  // Calcula data de início baseada no período
  const now = new Date()
  const startDate = new Date()
  if (period === '7d')  startDate.setDate(now.getDate() - 7)
  if (period === '30d') startDate.setDate(now.getDate() - 30)
  if (period === '90d') startDate.setDate(now.getDate() - 90)
  if (period === 'today') { startDate.setHours(0, 0, 0, 0) }

  // Busca todos os pedidos do período
  const orders = await prisma.order.findMany({
    where: {
      pizzaria_id: pizzariaId,
      created_at: { gte: startDate },
    },
    orderBy: { created_at: 'asc' },
  })

  const delivered = orders.filter(o => o.status === 'delivered')
  const canceled  = orders.filter(o => o.status === 'canceled')
  const pending   = orders.filter(o => ['pending', 'preparing', 'delivering'].includes(o.status))

  // ── Totais ──
  const totalRevenue    = delivered.reduce((sum, o) => sum + o.total_amount, 0)
  const totalOrders     = orders.length
  const deliveredCount  = delivered.length
  const canceledCount   = canceled.length
  const avgTicket       = deliveredCount > 0 ? totalRevenue / deliveredCount : 0

  // ── Receita por dia ──
  const revenueByDay: Record<string, number> = {}
  const ordersByDay:  Record<string, number> = {}

  delivered.forEach(o => {
    const day = new Date(o.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    revenueByDay[day] = (revenueByDay[day] || 0) + o.total_amount
    ordersByDay[day]  = (ordersByDay[day]  || 0) + 1
  })

  const dailyData = Object.entries(revenueByDay).map(([date, revenue]) => ({
    date,
    revenue: parseFloat(revenue.toFixed(2)),
    orders: ordersByDay[date] || 0,
  }))

  // ── Produtos mais vendidos ──
  const productCount: Record<string, { name: string; count: number; revenue: number }> = {}

  delivered.forEach(o => {
    const items = o.order_items_json as any[]
    if (!Array.isArray(items)) return
    items.forEach(item => {
      const key = item.name || 'Desconhecido'
      if (!productCount[key]) productCount[key] = { name: key, count: 0, revenue: 0 }
      productCount[key].count++
      productCount[key].revenue += Number(item.price) || 0
    })
  })

  const topProducts = Object.values(productCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(p => ({ ...p, revenue: parseFloat(p.revenue.toFixed(2)) }))

  // ── Formas de pagamento ──
  const paymentMethods: Record<string, number> = {}
  delivered.forEach(o => {
    const method = o.payment_method.toLowerCase()
    paymentMethods[method] = (paymentMethods[method] || 0) + 1
  })

  // ── Pedidos por hora do dia ──
  const ordersByHour: Record<number, number> = {}
  orders.forEach(o => {
    const hour = new Date(o.created_at).getHours()
    ordersByHour[hour] = (ordersByHour[hour] || 0) + 1
  })

  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, '0')}h`,
    orders: ordersByHour[h] || 0,
  }))

  // ── Taxa de cancelamento ──
  const cancelRate = totalOrders > 0 ? (canceledCount / totalOrders) * 100 : 0

  return NextResponse.json({
    summary: {
      totalRevenue:   parseFloat(totalRevenue.toFixed(2)),
      totalOrders,
      deliveredCount,
      canceledCount,
      pendingCount:   pending.length,
      avgTicket:      parseFloat(avgTicket.toFixed(2)),
      cancelRate:     parseFloat(cancelRate.toFixed(1)),
    },
    dailyData,
    topProducts,
    paymentMethods,
    hourlyData,
  })
}