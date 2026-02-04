'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // <--- IMPORTANTE: Importar o Link

// Tipagem do Pedido
interface Order {
  id: number
  order_number: number
  customer_name: string
  customer_phone: string
  delivery_address: string
  total_amount: number
  status: string
  payment_method: string
  change_for: string
  order_items_json: any[]
  created_at: string
}

export default function Dashboard() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [pizzaria, setPizzaria] = useState<any>(null) 
  const [loading, setLoading] = useState(true)

  // Função para tocar som
  const playNotification = () => {
    try {
      const audio = new Audio('/notification.mp3')
      audio.play()
    } catch (e) {
      console.log('Erro ao tocar som:', e)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      // 1. Verificar Sessão
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/admin')
        return
      }

      // 2. Buscar Dados da Pizzaria (Logo e Nome)
      const { data: pizzariaData } = await supabase.from('pizzarias').select('*').single()
      if (pizzariaData) setPizzaria(pizzariaData)

      // 3. Buscar Pedidos
      const { data: ordersData } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (ordersData) setOrders(ordersData)
      setLoading(false)
    }

    fetchData()

    // --- REALTIME ---
    const channel = supabase
      .channel('realtime-orders')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        console.log('Novo pedido!', payload)
        playNotification()
        setOrders((currentOrders) => [payload.new as Order, ...currentOrders])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const updateStatus = async (id: number, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', id)

    if (!error) {
      setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o))
    }
  }

  if (loading) return <div className="p-10 text-center">Carregando painel...</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      {/* NAVBAR DO ADMIN */}
      <nav className="bg-white shadow px-6 py-4 mb-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          
          {/* Lado Esquerdo: Logo e Título */}
          <div className="flex items-center gap-4">
            {pizzaria?.logo_url ? (
              <img src={pizzaria.logo_url} className="w-10 h-10 rounded-full object-cover border" />
            ) : (
              <span className="text-2xl">🍕</span>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {pizzaria?.name || 'Painel do Dono'}
              </h1>
              <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Online</span>
            </div>
          </div>

          {/* Lado Direito: Menu e Sair */}
          <div className="flex items-center gap-4">
             <div className="hidden md:flex gap-2">
                <Link href="/admin/products" className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-100 transition">
                  📦 Gerenciar Cardápio
                </Link>
                <Link href="/admin/settings" className="bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-100 transition">
                  ⚙️ Configurações
                </Link>
             </div>
             
             <div className="h-6 w-px bg-gray-300 mx-2"></div>

             <button 
              onClick={async () => { await supabase.auth.signOut(); router.push('/admin') }}
              className="text-sm font-semibold text-red-500 hover:text-red-700"
            >
              Sair
            </button>
          </div>
        </div>

        {/* Menu Mobile (Só aparece em telas pequenas) */}
        <div className="md:hidden mt-4 flex gap-2 border-t pt-4">
            <Link href="/admin/products" className="flex-1 text-center bg-blue-50 text-blue-700 px-3 py-2 rounded text-xs font-bold">
              📦 Produtos
            </Link>
            <Link href="/admin/settings" className="flex-1 text-center bg-gray-50 text-gray-700 px-3 py-2 rounded text-xs font-bold">
              ⚙️ Config
            </Link>
        </div>
      </nav>

      {/* LISTA DE PEDIDOS */}
      <div className="max-w-4xl mx-auto p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center justify-between">
          <span>Pedidos Recentes</span>
          <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full">{orders.length}</span>
        </h2>

        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className={`bg-white rounded-xl shadow-sm border-l-4 overflow-hidden ${
              order.status === 'pending' ? 'border-yellow-400' : 
              order.status === 'delivered' ? 'border-green-500' : 'border-blue-400'
            }`}>
              {/* Header do Pedido */}
              <div className="p-4 border-b bg-gray-50 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-gray-800">#{order.order_number} - {order.customer_name}</h3>
                  <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {order.status === 'pending' ? 'Pendente' : 
                   order.status === 'delivered' ? 'Concluído' : order.status}
                </span>
              </div>

              {/* Detalhes */}
              <div className="p-4 grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wide mb-2">🛒 Itens</h4>
                  <ul className="space-y-2">
                    {order.order_items_json.map((item: any, idx: number) => (
                      <li key={idx} className="text-sm text-gray-700 border-b pb-2 last:border-0">
                        <span className="font-bold">{item.name}</span> <span className="text-gray-500">({item.size})</span>
                        {item.flavors && item.flavors.length > 0 && (
                          <div className="text-xs text-gray-500">+ {item.flavors.join(', ')}</div>
                        )}
                        {item.observation && <div className="text-xs text-red-500 italic">Obs: {item.observation}</div>}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-gray-400 text-xs uppercase tracking-wide mb-2">📍 Entrega</h4>
                  <p className="text-sm text-gray-700 mb-1">{order.delivery_address}</p>
                  <p className="text-sm text-gray-700 font-medium">📞 {order.customer_phone}</p>
                  
                  <div className="mt-3 bg-green-50 p-3 rounded border border-green-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-green-700 font-bold uppercase">Total</span>
                      <span className="text-lg font-bold text-green-800">R$ {order.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Pagamento: <span className="font-bold capitalize">{order.payment_method}</span>
                      {order.change_for && <span> (Troco para R$ {order.change_for})</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ações */}
              <div className="p-3 bg-gray-50 flex justify-end gap-2">
                {order.status !== 'delivered' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'delivered')}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded shadow-sm hover:bg-green-700 transition flex items-center gap-2"
                  >
                    ✅ Marcar como Entregue
                  </button>
                )}
              </div>
            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
              <p className="text-4xl mb-2">😴</p>
              <p className="text-gray-500">Nenhum pedido na fila.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}