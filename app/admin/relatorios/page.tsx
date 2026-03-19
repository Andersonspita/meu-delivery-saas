// app/admin/relatorios/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Period = 'today' | '7d' | '30d' | '90d'

interface Summary {
  totalRevenue:   number
  totalOrders:    number
  deliveredCount: number
  canceledCount:  number
  pendingCount:   number
  avgTicket:      number
  cancelRate:     number
}

interface DailyData   { date: string; revenue: number; orders: number }
interface TopProduct  { name: string; count: number; revenue: number }
interface HourlyData  { hour: string; orders: number }

interface ReportData {
  summary:        Summary
  dailyData:      DailyData[]
  topProducts:    TopProduct[]
  paymentMethods: Record<string, number>
  hourlyData:     HourlyData[]
}

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  '7d':  'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
}

const PAYMENT_LABELS: Record<string, string> = {
  pix:       'PIX',
  dinheiro:  'Dinheiro',
  credito:   'Crédito',
  debito:    'Débito',
  cartao:    'Cartão',
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Mini bar chart usando divs
function BarChart({ data, valueKey, labelKey, color = '#dc2626' }: {
  data: any[]; valueKey: string; labelKey: string; color?: string
}) {
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  return (
    <div className="flex items-end gap-1 h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full rounded-t-sm transition-all duration-300 min-h-[2px]"
            style={{ height: `${(d[valueKey] / max) * 100}%`, backgroundColor: color, opacity: 0.85 }}
          />
          {/* Tooltip */}
          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
            {d[labelKey]}: {typeof d[valueKey] === 'number' && d[valueKey] > 100 ? formatCurrency(d[valueKey]) : d[valueKey]}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function AdminRelatoriosPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<Period>('7d')
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    fetch(`/api/admin/reports?period=${period}`)
      .then(r => { if (r.status === 401) { router.push('/admin'); return r } return r })
      .then(r => r.json())
      .then(d => { if (d.summary) setData(d) })
      .finally(() => setIsLoading(false))
  }, [period, router])

  const paymentEntries = data
    ? Object.entries(data.paymentMethods).sort((a, b) => b[1] - a[1])
    : []

  const totalPayments = paymentEntries.reduce((sum, [, v]) => sum + v, 0)

  // Filtra horas com movimento para o gráfico
  const activeHours = data?.hourlyData.filter(h => h.orders > 0) || []

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Navbar */}
      <nav className="bg-white border-b px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-black text-gray-900 text-sm uppercase tracking-tight">Relatórios</h1>
          </div>

          {/* Seletor de período */}
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  period === p
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">📊</div>
            <p className="text-sm text-gray-400 font-medium">Nenhum dado encontrado para este período</p>
          </div>
        ) : (
          <>
            {/* ── CARDS DE RESUMO ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Faturamento</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(data.summary.totalRevenue)}</p>
                <p className="text-[10px] text-gray-400 mt-1">{data.summary.deliveredCount} pedidos entregues</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ticket Médio</p>
                <p className="text-xl font-black text-gray-900">{formatCurrency(data.summary.avgTicket)}</p>
                <p className="text-[10px] text-gray-400 mt-1">por pedido entregue</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Pedidos</p>
                <p className="text-xl font-black text-gray-900">{data.summary.totalOrders}</p>
                <div className="flex gap-2 mt-1">
                  {data.summary.pendingCount > 0 && (
                    <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                      {data.summary.pendingCount} ativos
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cancelamentos</p>
                <p className="text-xl font-black text-gray-900">{data.summary.canceledCount}</p>
                <p className={`text-[10px] mt-1 font-bold ${data.summary.cancelRate > 10 ? 'text-red-500' : 'text-gray-400'}`}>
                  {data.summary.cancelRate}% do total
                </p>
              </div>
            </div>

            {/* ── GRÁFICO RECEITA DIÁRIA ── */}
            {data.dailyData.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Receita por Dia</h2>
                  <span className="text-xs text-gray-400 font-medium">{PERIOD_LABELS[period]}</span>
                </div>
                <BarChart data={data.dailyData} valueKey="revenue" labelKey="date" color="#dc2626" />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-300">{data.dailyData[0]?.date}</span>
                  <span className="text-[10px] text-gray-300">{data.dailyData[data.dailyData.length - 1]?.date}</span>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">

              {/* ── PRODUTOS MAIS VENDIDOS ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight mb-4">
                  Mais Vendidos
                </h2>
                {data.topProducts.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Nenhum produto vendido neste período</p>
                ) : (
                  <ul className="space-y-3">
                    {data.topProducts.map((p, i) => {
                      const max = data.topProducts[0].count
                      const pct = (p.count / max) * 100
                      return (
                        <li key={i}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                i === 0 ? 'bg-yellow-100 text-yellow-700' :
                                i === 1 ? 'bg-gray-100 text-gray-600' :
                                i === 2 ? 'bg-orange-100 text-orange-600' :
                                'bg-gray-50 text-gray-400'
                              }`}>{i + 1}</span>
                              <span className="text-xs font-semibold text-gray-800 truncate">{p.name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <span className="text-[10px] text-gray-400 font-medium">{p.count}x</span>
                              <span className="text-xs font-bold text-gray-700">{formatCurrency(p.revenue)}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-red-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {/* ── FORMAS DE PAGAMENTO ── */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight mb-4">
                  Pagamentos
                </h2>
                {paymentEntries.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Nenhum pagamento neste período</p>
                ) : (
                  <div className="space-y-3">
                    {paymentEntries.map(([method, count]) => {
                      const pct = totalPayments > 0 ? (count / totalPayments) * 100 : 0
                      const colors: Record<string, string> = {
                        pix: '#22c55e', dinheiro: '#f59e0b', credito: '#3b82f6',
                        debito: '#8b5cf6', cartao: '#6366f1',
                      }
                      const color = colors[method] || '#6b7280'
                      return (
                        <div key={method}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-800">
                              {PAYMENT_LABELS[method] || method.toUpperCase()}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-gray-400">{count} pedidos</span>
                              <span className="text-xs font-bold text-gray-700">{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── PEDIDOS POR HORA ── */}
            {activeHours.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Pedidos por Horário</h2>
                  <span className="text-xs text-gray-400 font-medium">Pico de movimento</span>
                </div>
                <BarChart data={data.hourlyData} valueKey="orders" labelKey="hour" color="#f97316" />
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-gray-300">00h</span>
                  <span className="text-[10px] text-gray-300">23h</span>
                </div>
                {/* Hora de pico */}
                {(() => {
                  const peak = data.hourlyData.reduce((a, b) => a.orders > b.orders ? a : b)
                  if (peak.orders === 0) return null
                  return (
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      Horário de pico: <span className="font-black text-gray-800">{peak.hour}</span> com <span className="font-black text-orange-600">{peak.orders} pedidos</span>
                    </p>
                  )
                })()}
              </div>
            )}

            {/* ── RODAPÉ INFO ── */}
            <p className="text-center text-[10px] text-gray-300 pb-4">
              Dados referentes a pedidos com status <strong>entregue</strong> no período selecionado.
              Atualiza ao trocar o período.
            </p>
          </>
        )}
      </div>
    </div>
  )
}