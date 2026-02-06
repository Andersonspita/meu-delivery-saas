'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { connectToPrinter, printOrder } from '@/utils/printer'

interface Order {
  id: number
  order_number: number
  customer_name: string
  customer_phone: string
  delivery_address: string
  total_amount: number
  status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'canceled'
  cancellation_reason?: string
  payment_method: string
  change_for: string
  order_items_json: any[]
  pizzaria_id: string // Importante para tipagem
  created_at: string
}

const CANCEL_REASONS = [
  "Cliente desistiu do pedido",
  "Endereço fora da área de entrega",
  "Sem entregador disponível no momento",
  "Ingredientes em falta",
  "Pedido suspeito / Trote",
  "Outros"
]

export default function Dashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [pizzaria, setPizzaria] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [printerChar, setPrinterChar] = useState<any>(null)

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null)
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0])
  const [customReason, setCustomReason] = useState('')

  const playNotification = () => {
    try {
      const audio = new Audio('/notification.mp3')
      audio.play().catch(e => console.log('Interação necessária para tocar som'))
    } catch (e) {
      console.log('Erro ao tocar som:', e)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      // 1. Verifica Login
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/admin')
        return
      }

      try {
        const userId = session.user.id

        // 2. MUDANÇA CRUCIAL: Descobre qual pizzaria esse usuário administra
        const { data: adminLink, error: linkError } = await supabase
          .from('admin_users')
          .select('pizzaria_id')
          .eq('user_id', userId)
          .single()

        if (linkError || !adminLink) {
          alert('Seu usuário não está vinculado a nenhuma pizzaria! Contate o suporte.')
          await supabase.auth.signOut()
          router.push('/admin')
          return
        }

        const myPizzariaId = adminLink.pizzaria_id

        // 3. Busca os dados APENAS da pizzaria vinculada
        const { data: pizzariaData, error: pizzariaError } = await supabase
          .from('pizzarias')
          .select('*')
          .eq('id', myPizzariaId) // <--- FILTRO DE SEGURANÇA
          .single()

        if (pizzariaError || !pizzariaData) throw new Error('Erro ao carregar dados da pizzaria')
        setPizzaria(pizzariaData)

        // 4. Busca os pedidos APENAS dessa pizzaria
        const { data: ordersData } = await supabase
          .from('orders')
          .select('*')
          .eq('pizzaria_id', myPizzariaId) // <--- FILTRO DE SEGURANÇA NOS PEDIDOS
          .order('created_at', { ascending: false })
        
        if (ordersData) setOrders(ordersData as Order[])

        // 5. Configura Realtime isolado para esta pizzaria
        const channel = supabase
            .channel(`realtime-orders-${myPizzariaId}`) // Canal único
            .on(
                'postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'orders',
                    filter: `pizzaria_id=eq.${myPizzariaId}` // <--- Só escuta eventos desta loja
                }, 
                (payload) => {
                    playNotification()
                    setOrders((currentOrders) => [payload.new as Order, ...currentOrders])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }

      } catch (error) {
        console.error('Erro:', error)
        alert('Erro ao carregar painel.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  const handleConnectPrinter = async () => {
    const conn = await connectToPrinter()
    if (conn) {
      setPrinterChar(conn.characteristic)
      alert('Impressora Conectada! 🖨️')
    }
  }

  const handlePrint = async (order: Order) => {
    if (!printerChar) {
      alert('Conecte a impressora primeiro! Clique no botão "🔌 Conectar" lá em cima.')
      return
    }
    // Usa o nome da pizzaria carregada dinamicamente
    const orderToPrint = { ...order, pizzaria_name: pizzaria?.name }
    await printOrder(printerChar, orderToPrint)
  }

  const handleNextStep = async (order: Order) => {
    let nextStatus: Order['status'] = 'pending'
    let message = ''

    switch (order.status) {
      case 'pending':
        nextStatus = 'preparing'
        message = `Olá ${order.customer_name}! 👨‍🍳\n\nConfirmamos seu pedido *#${order.order_number}*.\nEle já está sendo preparado na cozinha com todo carinho! 🍕🔥`
        break
      case 'preparing':
        nextStatus = 'delivering'
        message = `Boas notícias, ${order.customer_name}! 🛵💨\n\nSeu pedido *#${order.order_number}* acabou de sair para entrega.\nFique atento à campainha ou interfone!`
        break
      case 'delivering':
        nextStatus = 'delivered'
        message = `Pedido Entregue! ✅\n\nEsperamos que goste da sua pizza. Obrigado pela preferência e até a próxima! 😋`
        break
      default: return 
    }

    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id)

    if (!error) {
      setOrders(orders.map(o => o.id === order.id ? { ...o, status: nextStatus } : o))
      
      // Mantendo a máscara do 55
      const cleanPhone = order.customer_phone.replace(/\D/g, '')
      const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
    } else {
      alert('Erro ao atualizar status')
    }
  }

  const openCancelModal = (order: Order) => {
    setOrderToCancel(order)
    setSelectedReason(CANCEL_REASONS[0])
    setCustomReason('')
    setIsCancelModalOpen(true)
  }

  const confirmCancellation = async () => {
    if (!orderToCancel) return
    const finalReason = selectedReason === 'Outros' ? customReason : selectedReason

    if (!finalReason || finalReason.trim() === '') {
      alert('Por favor, informe o motivo do cancelamento.')
      return
    }
    
    const message = `Olá ${orderToCancel.customer_name}.\n\nInfelizmente seu pedido *#${orderToCancel.order_number}* precisou ser cancelado. 😔\n\n*Motivo:* ${finalReason}\n\nPedimos desculpas pelo inconveniente.`

    const { error } = await supabase
      .from('orders')
      .update({ status: 'canceled', cancellation_reason: finalReason })
      .eq('id', orderToCancel.id)

    if (!error) {
      setOrders(orders.map(o => o.id === orderToCancel.id ? { ...o, status: 'canceled', cancellation_reason: finalReason } : o))
      
      const cleanPhone = orderToCancel.customer_phone.replace(/\D/g, '')
      const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
      
      setIsCancelModalOpen(false)
      setOrderToCancel(null)
    } else {
      alert('Erro ao cancelar pedido.')
    }
  }

  const getStatusInfo = (order: Order) => {
    switch (order.status) {
      case 'pending': return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: '🕒' }
      case 'preparing': return { label: 'Em Preparo', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🔥' }
      case 'delivering': return { label: 'Saiu p/ Entrega', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🛵' }
      case 'delivered': return { label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' }
      case 'canceled': return { label: 'Cancelado', color: 'bg-red-100 text-red-800 border-red-200', icon: '❌' }
      default: return { label: order.status, color: 'bg-gray-100', icon: '?' }
    }
  }

  if (loading) return <div className="p-10 text-center animate-pulse">Carregando painel da sua pizzaria...</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-10 relative">
      <nav className="bg-white shadow px-6 py-4 mb-6 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            {pizzaria?.logo_url ? (
              <img src={pizzaria.logo_url} className="w-10 h-10 rounded-full object-cover border" />
            ) : (
              <span className="text-2xl">🍕</span>
            )}
            <h1 className="text-xl font-bold text-gray-800 hidden md:block">
              {pizzaria?.name || 'Painel do Dono'}
            </h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
             <button 
                onClick={handleConnectPrinter}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold border transition ${
                    printerChar ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                }`}
             >
                {printerChar ? '🖨️ Conectada' : '🔌 Conectar Impressora'}
             </button>

             <div className="h-6 w-px bg-gray-300 mx-1"></div>
             
             <div className="flex gap-2">
                <Link href="/admin/products" className="bg-blue-50 text-blue-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-blue-100">📦 Menu</Link>
                <Link href="/admin/settings" className="bg-gray-50 text-gray-700 px-3 py-2 rounded-lg text-xs sm:text-sm font-bold hover:bg-gray-100">⚙️ Config</Link>
             </div>
             
             <button onClick={async () => { await supabase.auth.signOut(); router.push('/admin') }} className="text-sm font-semibold text-red-500 hover:text-red-700 ml-2">Sair</button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <span>Fila de Pedidos</span>
          <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {orders.filter(o => o.status !== 'delivered' && o.status !== 'canceled').length}
          </span>
        </h2>

        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order)
            
            return (
              <div key={order.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden transition-all ${
                order.status === 'delivered' ? 'border-green-500 opacity-60' : 
                order.status === 'canceled' ? 'border-red-500 opacity-60 grayscale-[0.5]' : 'border-red-500'
              }`}>
                <div className="p-4 border-b bg-gray-50 flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                      #{order.order_number} <span className="text-gray-400 font-normal">| {order.customer_name}</span>
                    </h3>
                    <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border flex items-center gap-1 ${statusInfo.color}`}>
                    <span>{statusInfo.icon}</span> {statusInfo.label}
                  </div>
                </div>

                <div className="p-4 grid md:grid-cols-2 gap-6">
                  {order.status === 'canceled' && order.cancellation_reason && (
                    <div className="md:col-span-2 bg-red-50 border border-red-200 p-3 rounded-lg text-red-800 text-sm mb-2">
                      <strong>Motivo do Cancelamento:</strong> {order.cancellation_reason}
                    </div>
                  )}

                  <div>
                    <ul className="space-y-3">
                      {order.order_items_json.map((item: any, idx: number) => (
                        <li key={idx} className="text-sm text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                          <div className="flex justify-between">
                            <span className="font-bold">{item.name}</span>
                            <span className="text-xs text-gray-500 bg-white px-1 rounded border">{item.size}</span>
                          </div>
                          {item.flavors && item.flavors.length > 0 && (
                            <div className="text-xs text-gray-600 mt-1">+ {item.flavors.join(', ')}</div>
                          )}
                          {item.observation && (
                            <div className="text-xs text-red-600 font-bold mt-1 bg-red-50 p-1 rounded">⚠️ {item.observation}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="text-sm">
                    <div className="mb-3">
                        <p className="font-bold text-gray-500 text-xs uppercase mb-1">📍 Endereço</p>
                        <p className="text-gray-800 leading-snug">{order.delivery_address}</p>
                        
                        <a 
                            href={`https://wa.me/55${order.customer_phone.replace(/\D/g, '')}`} 
                            target="_blank"
                            className="text-green-600 font-bold hover:underline text-xs mt-1 inline-flex items-center gap-1"
                        >
                            📞 {order.customer_phone}
                        </a>
                    </div>
                    
                    <div className="bg-green-50 p-3 rounded border border-green-100">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-green-700 font-bold uppercase">Total</span>
                        <span className="text-lg font-bold text-green-800">R$ {order.total_amount.toFixed(2)}</span>
                      </div>
                      <div className="text-xs text-green-700 border-t border-green-200 pt-1 mt-1">
                        Forma: <span className="font-bold uppercase">{order.payment_method}</span>
                        {order.change_for && <span> (Troco p/ {order.change_for})</span>}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                    
                    <div className="flex gap-3 w-full sm:w-auto">
                        {order.status !== 'delivered' && order.status !== 'canceled' && (
                            <button 
                                onClick={() => openCancelModal(order)}
                                className="text-red-500 text-xs font-bold hover:text-red-700 hover:underline px-2"
                            >
                                ❌ Cancelar
                            </button>
                        )}
                        
                        <button 
                            onClick={() => handlePrint(order)}
                            className="text-gray-500 text-xs font-bold hover:text-gray-800 border px-2 py-1 rounded bg-white hover:bg-gray-100"
                            title="Imprimir Pedido"
                        >
                            🖨️ Imprimir
                        </button>
                    </div>

                    {order.status === 'pending' && (
                        <button onClick={() => handleNextStep(order)} className="w-full sm:w-auto px-6 py-2 bg-orange-500 text-white font-bold rounded shadow hover:bg-orange-600 transition flex items-center justify-center gap-2">👨‍🍳 Aceitar e Iniciar</button>
                    )}
                    {order.status === 'preparing' && (
                        <button onClick={() => handleNextStep(order)} className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition flex items-center justify-center gap-2">🛵 Saiu para Entrega</button>
                    )}
                    {order.status === 'delivering' && (
                        <button onClick={() => handleNextStep(order)} className="w-full sm:w-auto px-6 py-2 bg-green-600 text-white font-bold rounded shadow hover:bg-green-700 transition flex items-center justify-center gap-2">✅ Confirmar Entrega</button>
                    )}
                  </div>
              </div>
            )
          })}
        </div>
      </div>

      {isCancelModalOpen && orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              ❌ Cancelar Pedido #{orderToCancel.order_number}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Motivo:</label>
                <select 
                  className="w-full p-2 border rounded bg-white text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                >
                  {CANCEL_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              {selectedReason === 'Outros' && (
                <div className="animate-in slide-in-from-top-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Digite o motivo:</label>
                  <textarea 
                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-red-500 outline-none"
                    rows={3}
                    placeholder="Ex: Ocorreu um problema na cozinha..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    autoFocus
                  />
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setIsCancelModalOpen(false)}
                  className="flex-1 py-2 border rounded text-gray-600 font-bold hover:bg-gray-50"
                >
                  Voltar
                </button>
                <button 
                  onClick={confirmCancellation}
                  className="flex-1 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 shadow"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}