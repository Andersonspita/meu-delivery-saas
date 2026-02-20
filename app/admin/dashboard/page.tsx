'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatAdminConfirmationMessage, formatCancellationMessage } from '@/utils/whatsappFormatter'
import { connectToPrinter, printOrder } from '@/utils/printer'

export interface Order {
  id: string
  order_number: number
  created_at: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  payment_method: string
  total_amount: number
  status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'canceled'
  order_items_json: any[]
  pizzaria_id: string
  cancellation_reason?: string
}

type TabStatus = 'ativos' | 'finalizados' | 'cancelados'

const CANCEL_REASONS = [
  "Endereço fora da área de entrega",
  "Sem entregador disponível no momento",
  "Ingredientes em falta",
  "Pedido suspeito / Trote",
  "Outros"
]

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

  const [printerChar, setPrinterChar] = useState<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
    
    const initializeDashboard = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/admin')

      try {
        const { data: adminLink } = await supabase
          .from('admin_users')
          .select('pizzaria_id')
          .eq('user_id', session.user.id)
          .single()

        if (!adminLink) throw new Error('Acesso negado.')

        const myPizzariaId = adminLink.pizzaria_id

        const [pizzariaRes, ordersRes] = await Promise.all([
          supabase.from('pizzarias').select('*').eq('id', myPizzariaId).single(),
          supabase.from('orders')
            .select('*')
            .eq('pizzaria_id', myPizzariaId)
            .order('created_at', { ascending: false })
        ])

        setPizzaria(pizzariaRes.data)
        setOrders(ordersRes.data || [])

        const channel = supabase
          .channel(`orders-${myPizzariaId}`)
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `pizzaria_id=eq.${myPizzariaId}` }, (payload) => {
            audioRef.current?.play().catch(() => {})
            setOrders((prev) => [payload.new as Order, ...prev])
            setActiveTab('ativos')
          })
          .subscribe()

        return () => { supabase.removeChannel(channel) }
      } catch (err) {
        router.push('/admin')
      } finally {
        setIsLoading(false)
      }
    }
    initializeDashboard()
  }, [router])

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'ativos') return ['pending', 'preparing', 'delivering'].includes(order.status)
    if (activeTab === 'finalizados') return order.status === 'delivered'
    if (activeTab === 'cancelados') return order.status === 'canceled'
    return false
  })

  const handleUpdateStatus = async (order: Order, nextStatus: Order['status']) => {
    const { error } = await supabase.from('orders').update({ status: nextStatus }).eq('id', order.id)
    if (error) return alert('Erro ao atualizar status.')

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: nextStatus } : o))

    if (nextStatus === 'preparing') {
      const baseUrl = window.location.origin
      const trackingUrl = `${baseUrl}/${pizzaria.slug}/track/${order.id}`
      const message = formatAdminConfirmationMessage(order.order_number, pizzaria.name, order.customer_name, trackingUrl)
      window.open(`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
    }

    if (nextStatus === 'delivering') {
      const message = `🚀 *PEDIDO #${order.order_number} A CAMINHO!*\n\nOlá ${order.customer_name}, sua entrega acabou de sair. Fique atento!`
      window.open(`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
    }
  }

  const openCancelModal = (order: Order) => {
    setOrderToCancel(order)
    setIsCancelModalOpen(true)
  }

  const confirmCancellation = async () => {
    if (!orderToCancel) return
    const reason = selectedReason === 'Outros' ? customReason : selectedReason
    const { error } = await supabase.from('orders').update({ status: 'canceled', cancellation_reason: reason }).eq('id', orderToCancel.id)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderToCancel.id ? { ...o, status: 'canceled', cancellation_reason: reason } : o))
      const message = formatCancellationMessage(orderToCancel.order_number, orderToCancel.customer_name, reason)
      window.open(`https://wa.me/55${orderToCancel.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank')
      setIsCancelModalOpen(false)
    }
  }

  if (isLoading) return <div className="p-10 text-center animate-pulse text-gray-400 font-black uppercase">Sincronizando...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <nav className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-lg overflow-hidden">
              {pizzaria?.logo_url ? <img src={pizzaria.logo_url} className="w-full h-full object-cover" /> : '🍕'}
            </div>
            <h1 className="font-black text-gray-800 uppercase tracking-tighter text-lg">{pizzaria?.name}</h1>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link href="/admin/products" className="bg-blue-600 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition shadow-sm">📦 Produtos</Link>
            <Link href="/admin/delivery" className="bg-orange-500 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-orange-600 transition shadow-sm">🛵 Taxas</Link>
            <Link href="/admin/operating-hours" className="bg-purple-600 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-purple-700 transition shadow-sm">🕒 Horários</Link>
            <Link href="/admin/settings" className="bg-gray-800 text-white px-3 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition shadow-sm">⚙️ Config</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/admin') }} className="p-2 text-gray-400 hover:text-red-600 transition ml-2">Sair</button>
          </div>
        </div>
      </nav>

      <div className="bg-white border-b sticky top-[120px] md:top-[73px] z-30 flex">
        {['ativos', 'finalizados', 'cancelados'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab as TabStatus)} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest border-b-4 transition ${activeTab === tab ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400'}`}>
            {tab} {tab === 'ativos' && filteredOrders.length > 0 && `(${filteredOrders.length})`}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 pb-10">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2">
            <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
              <h3 className="font-black text-2xl text-gray-800">#{order.order_number}</h3>
              <p className="text-2xl font-black text-green-600">R$ {order.total_amount.toFixed(2)}</p>
            </div>
            <div className="p-6 grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Itens</h4>
                <ul className="space-y-2">
                  {order.order_items_json.map((item, idx) => (
                    <li key={idx} className="bg-gray-50 p-3 rounded-2xl border border-gray-100 text-sm font-bold">
                      {item.quantity}x {item.name} ({item.size})
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Cliente</h4>
                  <p className="font-black text-gray-800 leading-none">{order.customer_name}</p>
                  <p className="text-xs text-green-600 font-bold underline">{order.customer_phone}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Endereço</h4>
                  <p className="text-sm text-gray-600 font-medium">{order.delivery_address}</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t flex flex-wrap gap-3">
              {activeTab === 'ativos' && (
                <>
                  <button onClick={() => openCancelModal(order)} className="text-red-500 text-[10px] font-black uppercase hover:underline px-2 tracking-widest">Cancelar</button>
                  {order.status === 'pending' && <button onClick={() => handleUpdateStatus(order, 'preparing')} className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-orange-100">Aceitar Pedido</button>}
                  {order.status === 'preparing' && <button onClick={() => handleUpdateStatus(order, 'delivering')} className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-blue-100">Enviar Entrega</button>}
                  {order.status === 'delivering' && <button onClick={() => handleUpdateStatus(order, 'delivered')} className="flex-1 bg-green-600 text-white py-3 rounded-2xl font-black text-xs uppercase shadow-lg shadow-green-100">Concluir</button>}
                </>
              )}
              <button onClick={async () => await printOrder(printerChar, { ...order, pizzaria_name: pizzaria?.name })} className="px-5 py-3 border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition">Imprimir</button>
            </div>
          </div>
        ))}
      </main>

      {isCancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95">
            <h3 className="text-lg font-black text-gray-800 mb-6 uppercase tracking-tighter italic">Cancelar #{orderToCancel.order_number}</h3>
            <div className="space-y-4">
              <select className="w-full p-3 border rounded-xl bg-gray-50 text-xs font-bold outline-none" value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
                {CANCEL_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsCancelModalOpen(false)} className="flex-1 py-3 border rounded-xl font-black text-[10px] uppercase text-gray-400">Voltar</button>
                <button onClick={confirmCancellation} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-100">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}