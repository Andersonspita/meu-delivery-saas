// app/admin/dashboard/page.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export interface Order {
  id: string
  order_number: number
  created_at: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  payment_method: string
  total_amount: number
  delivery_zone_price: number
  status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'canceled'
  order_items_json: any[]
  pizzaria_id: string
  cancellation_reason?: string
}

type TabStatus = 'ativos' | 'finalizados' | 'cancelados'

const CANCEL_REASONS = [
  'Endereco fora da area de entrega',
  'Sem entregador disponivel no momento',
  'Ingredientes em falta',
  'Pedido suspeito / Trote',
  'Outros',
]

const STATUS_LABEL: Record<Order['status'], string> = {
  pending: 'Novo',
  preparing: 'Preparando',
  delivering: 'Em entrega',
  delivered: 'Entregue',
  canceled: 'Cancelado',
}

const STATUS_COLOR: Record<Order['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  preparing: 'bg-orange-100 text-orange-700',
  delivering: 'bg-blue-100 text-blue-700',
  delivered: 'bg-green-100 text-green-700',
  canceled: 'bg-red-100 text-red-600',
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [pizzaria, setPizzaria] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabStatus>('ativos')
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0])
  const [customReason, setCustomReason] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const prevOrderIdsRef = useRef<Set<string>>(new Set())
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    const init = async () => {
      try {
        const sessionRes = await fetch('/api/admin/session')
        if (!sessionRes.ok) return router.push('/admin')
        const pizzariaRes = await fetch('/api/admin/pizzaria')
        if (pizzariaRes.ok) setPizzaria(await pizzariaRes.json())
        await fetchOrders(true)
      } catch { router.push('/admin') }
      finally { setIsLoading(false) }
    }
    init()
  }, [router])

  const fetchOrders = useCallback(async (isFirst = false) => {
    try {
      const res = await fetch('/api/admin/orders')
      if (res.status === 401) { router.push('/admin'); return }
      const data: Order[] = await res.json()
      if (!isFirst) {
        const hasNew = data.some(o => !prevOrderIdsRef.current.has(o.id))
        if (hasNew) { audioRef.current?.play().catch(() => {}); setActiveTab('ativos') }
      }
      prevOrderIdsRef.current = new Set(data.map(o => o.id))
      setOrders(data)
    } catch {}
  }, [router])

  useEffect(() => {
    if (isLoading) return
    pollingRef.current = setInterval(() => fetchOrders(), 15_000)
    return () => { if (pollingRef.current) clearInterval(pollingRef.current) }
  }, [isLoading, fetchOrders])

  const getTrackingUrl = (orderId: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/acompanhar/${orderId}`

  const handleUpdateStatus = async (order: Order, nextStatus: Order['status']) => {
    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: order.id, status: nextStatus }),
    })
    if (!res.ok) return alert('Erro ao atualizar status.')
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o))

    const phone = `55${order.customer_phone.replace(/\D/g, '')}`
    let msg = ''

    if (nextStatus === 'preparing') {
      msg =
        `*PEDIDO #${order.order_number} CONFIRMADO!*\n\n` +
        `Ola *${order.customer_name}*, seu pedido foi aceito e esta sendo preparado!`
    }

    if (nextStatus === 'delivering') {
      msg =
        `*PEDIDO #${order.order_number} SAIU PARA ENTREGA!*\n\n` +
        `Ola *${order.customer_name}*, seu pedido esta a caminho!`
    }

    if (nextStatus === 'delivered') {
      msg =
        `*PEDIDO #${order.order_number} ENTREGUE!*\n\n` +
        `Ola *${order.customer_name}*, seu pedido foi entregue!\n\n` +
        `Obrigado pela preferencia! Volte sempre.`
    }

    if (msg) window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const openCancelModal = (order: Order) => {
    setOrderToCancel(order)
    setSelectedReason(CANCEL_REASONS[0])
    setCustomReason('')
    setIsCancelModalOpen(true)
  }

  const confirmCancellation = async () => {
    if (!orderToCancel) return
    const reason = selectedReason === 'Outros' ? customReason : selectedReason
    if (!reason.trim()) return alert('Informe o motivo do cancelamento.')

    const res = await fetch('/api/admin/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderToCancel.id, status: 'canceled', cancellation_reason: reason }),
    })
    if (!res.ok) return alert('Erro ao cancelar pedido.')

    setOrders(prev => prev.map(o =>
      o.id === orderToCancel.id ? { ...o, status: 'canceled', cancellation_reason: reason } : o
    ))

    const phone = `55${orderToCancel.customer_phone.replace(/\D/g, '')}`
    const msg =
      `*PEDIDO #${orderToCancel.order_number} CANCELADO*\n\n` +
      `Ola *${orderToCancel.customer_name}*, infelizmente seu pedido foi cancelado.\n\n` +
      `*Motivo:* ${reason}\n\n` +
      `Pedimos desculpas pelo transtorno.`
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')

    setIsCancelModalOpen(false)
    setOrderToCancel(null)
  }

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin')
  }

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'ativos') return ['pending', 'preparing', 'delivering'].includes(order.status)
    if (activeTab === 'finalizados') return order.status === 'delivered'
    if (activeTab === 'cancelados') return order.status === 'canceled'
    return false
  })

  const activeCount = orders.filter(o => ['pending', 'preparing', 'delivering'].includes(o.status)).length

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">

      {/* NAVBAR */}
      <nav className="bg-white shadow-sm border-b px-4 md:px-6 py-3 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black shadow overflow-hidden shrink-0">
              {pizzaria?.logo_url ? <img src={pizzaria.logo_url} className="w-full h-full object-cover" alt="" /> : '🍕'}
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-sm uppercase tracking-tight leading-none">
                {pizzaria?.name || 'Painel Admin'}
              </h1>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${pizzaria?.is_open !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {pizzaria?.is_open !== false ? '● Aberta' : '● Fechada'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Link href="/admin/produtos" className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">📦 Produtos</Link>
            <Link href="/admin/categorias" className="bg-purple-600 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-purple-700 transition shadow-sm">📋 Categorias</Link>
            <Link href="/admin/taxas" className="bg-orange-500 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 transition shadow-sm">🛵 Taxas</Link>
            <Link href="/admin/relatorios" className="bg-green-600 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-green-700 transition shadow-sm">📊 Relatorios</Link>
            <Link href="/admin/settings" className="bg-gray-800 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition shadow-sm">⚙️ Config</Link>
            <button onClick={handleLogout} className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition border border-gray-200 rounded-xl hover:border-red-200">Sair</button>
          </div>
        </div>
      </nav>

      {/* TABS */}
      <div className="bg-white border-b sticky top-[61px] z-30 flex">
        {(['ativos', 'finalizados', 'cancelados'] as TabStatus[]).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition flex items-center justify-center gap-2 ${activeTab === tab ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            {tab}
            {tab === 'ativos' && activeCount > 0 && (
              <span className="bg-red-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center">{activeCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* PEDIDOS */}
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4 pb-10">
        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-5xl mb-4">{activeTab === 'ativos' ? '🎉' : activeTab === 'finalizados' ? '✅' : '❌'}</div>
            <p className="text-sm font-bold text-gray-500">{activeTab === 'ativos' ? 'Nenhum pedido ativo no momento' : `Nenhum pedido ${activeTab}`}</p>
            <p className="text-xs text-gray-400 mt-1">Atualizando automaticamente a cada 15s</p>
          </div>
        )}

        {filteredOrders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <h3 className="font-black text-2xl text-gray-900">#{order.order_number}</h3>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-green-600">R$ {order.total_amount.toFixed(2)}</p>
                <p className="text-[10px] text-gray-400">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>

            <div className="p-5 grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Itens</h4>
                <ul className="space-y-2">
                  {(order.order_items_json as any[]).map((item, idx) => (
                    <li key={idx} className="bg-gray-50 px-3 py-2.5 rounded-xl border border-gray-100 text-sm">
                      <span className="font-bold text-gray-900">{item.name}</span>
                      <span className="text-gray-400 text-xs ml-1">({item.size})</span>
                      {item.flavors?.length > 0 && <p className="text-xs text-gray-400 mt-0.5">Sabores: {item.flavors.join(' + ')}</p>}
                      {item.observation && <p className="text-xs text-orange-600 mt-0.5">Obs: {item.observation}</p>}
                      <p className="text-xs font-bold text-gray-700 mt-0.5">R$ {Number(item.price).toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cliente</h4>
                  <p className="font-black text-gray-900">{order.customer_name}</p>
                  <a href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-xs text-green-600 font-bold hover:underline">{order.customer_phone}</a>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Endereco</h4>
                  <p className="text-sm text-gray-600 font-medium">{order.delivery_address || 'Retirada no local'}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pagamento</h4>
                  <p className="text-sm font-bold text-gray-800 uppercase">{order.payment_method}</p>
                  {order.delivery_zone_price > 0 && <p className="text-xs text-gray-400">+ R$ {order.delivery_zone_price.toFixed(2)} entrega</p>}
                </div>
                {/* Link de rastreamento */}
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rastreamento</h4>
                  <a href={getTrackingUrl(order.id)} target="_blank" rel="noreferrer"
                    className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    Ver pagina do cliente
                  </a>
                </div>
                {order.cancellation_reason && (
                  <div>
                    <h4 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Motivo cancelamento</h4>
                    <p className="text-sm text-red-500 font-medium">{order.cancellation_reason}</p>
                  </div>
                )}
              </div>
            </div>

            {activeTab === 'ativos' && (
              <div className="px-5 pb-5 flex flex-wrap gap-3 items-center">
                <button onClick={() => openCancelModal(order)} className="text-red-500 text-[10px] font-black uppercase hover:underline tracking-widest px-1">Cancelar</button>
                {order.status === 'pending' && (
                  <button onClick={() => handleUpdateStatus(order, 'preparing')} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-100 transition active:scale-[0.98]">
                    Aceitar Pedido
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button onClick={() => handleUpdateStatus(order, 'delivering')} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-blue-100 transition active:scale-[0.98]">
                    Enviar para Entrega
                  </button>
                )}
                {order.status === 'delivering' && (
                  <button onClick={() => handleUpdateStatus(order, 'delivered')} className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg shadow-green-100 transition active:scale-[0.98]">
                    Concluir Pedido
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </main>

      {/* MODAL CANCELAMENTO */}
      {isCancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-base font-black text-gray-900 mb-1 uppercase tracking-tight">Cancelar #{orderToCancel.order_number}</h3>
            <p className="text-xs text-gray-400 mb-5">Selecione o motivo. O cliente sera avisado no WhatsApp.</p>
            <div className="space-y-3">
              <select className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                value={selectedReason} onChange={e => setSelectedReason(e.target.value)}>
                {CANCEL_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {selectedReason === 'Outros' && (
                <textarea placeholder="Descreva o motivo..." value={customReason} onChange={e => setCustomReason(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/30 resize-none" rows={3} />
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-3 border border-gray-200 rounded-xl font-black text-xs uppercase text-gray-500 hover:bg-gray-50 transition">Voltar</button>
                <button onClick={confirmCancellation} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-red-100 transition active:scale-[0.98]">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}