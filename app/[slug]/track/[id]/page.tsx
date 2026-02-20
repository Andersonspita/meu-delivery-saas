'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'

interface OrderItem {
  name: string
  size: string
  quantity: number
  price: number
  flavors?: string[]
  observation?: string
}

interface Order {
  id: string
  order_number: number
  status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'canceled'
  customer_name: string
  total_amount: number
  delivery_address: string
  payment_method: string
  order_items_json: OrderItem[]
  pizzarias: { 
    name: string, 
    logo_url: string,
    whatsapp: string 
  }
}

export default function OrderTrackingPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, pizzarias(name, logo_url, whatsapp)')
        .eq('id', id)
        .single()

      if (!error) setOrder(data)
      setLoading(false)
    }

    fetchOrder()

    // REALTIME: O pulo do gato para o cliente ver o status mudar sozinho
    const channel = supabase
      .channel(`track-${id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${id}` }, 
      (payload) => {
        setOrder(prev => prev ? { ...prev, status: payload.new.status } : null)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-gray-300 animate-pulse uppercase tracking-[0.3em]">Sincronizando Pedido...</div>
  if (!order) return <div className="min-h-screen flex items-center justify-center font-black text-red-500 uppercase">Pedido não localizado.</div>

  const steps = [
    { key: 'pending', label: 'Recebido', icon: '📝', desc: 'Aguardando confirmação' },
    { key: 'preparing', label: 'Na Cozinha', icon: '👨‍🍳', desc: 'Preparando sua pizza' },
    { key: 'delivering', label: 'A Caminho', icon: '🛵', desc: 'Saiu para entrega' },
    { key: 'delivered', label: 'Entregue', icon: '✅', desc: 'Bom apetite!' }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === order.status)
  const isCanceled = order.status === 'canceled'

  return (
    <div className="min-h-screen bg-gray-50 pb-12 font-sans">
      
      {/* HEADER PREMIUM */}
      <div className="bg-red-600 pt-12 pb-24 px-6 text-center text-white relative">
         <div className="max-w-md mx-auto">
            <div className="w-24 h-24 bg-white rounded-full mx-auto p-1 shadow-2xl mb-4">
                <img src={order.pizzarias.logo_url} className="w-full h-full rounded-full object-cover" alt="Logo" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight italic">{order.pizzarias.name}</h1>
            <div className="mt-2 inline-block bg-black/20 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
                Pedido #{order.order_number}
            </div>
         </div>
         {/* Onda decorativa */}
         <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none rotate-180">
            <svg className="relative block w-full h-[40px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V46.29C80.7,53,165.71,64.67,247.58,63.79,271.68,63.6,295.93,60.65,321.39,56.44Z" fill="#F9FAFB"></path>
            </svg>
         </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-12 space-y-6">
        
        {/* STATUS TRACKER */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          {isCanceled ? (
            <div className="text-center py-6">
              <span className="text-6xl block mb-4">😿</span>
              <h2 className="text-red-600 font-black uppercase text-xl">Pedido Cancelado</h2>
              <p className="text-xs text-gray-500 font-bold mt-2">Ocorreu um imprevisto e seu pedido foi cancelado. Entre em contato conosco.</p>
            </div>
          ) : (
            <div className="space-y-10 relative">
              {/* Linha de fundo */}
              <div className="absolute left-[19px] top-4 bottom-4 w-1 bg-gray-100 rounded-full"></div>
              
              {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex
                const isCurrent = index === currentStepIndex

                return (
                  <div key={step.key} className="flex items-start gap-6 relative z-10">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-lg transition-all duration-700 ${
                      isCompleted ? 'bg-green-500 text-white rotate-[360deg]' : 'bg-white text-gray-300 border-2 border-gray-100'
                    }`}>
                      {step.icon}
                    </div>
                    <div>
                      <p className={`text-sm font-black uppercase tracking-widest ${isCompleted ? 'text-gray-800' : 'text-gray-300'}`}>
                        {step.label}
                      </p>
                      <p className={`text-[10px] font-bold ${isCurrent ? 'text-green-500 animate-pulse' : 'text-gray-400'}`}>
                        {isCurrent ? step.desc : isCompleted ? 'Concluído' : 'Aguardando...'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* RESUMO DO PEDIDO */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
            <div className="p-6 bg-gray-50 border-b">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Resumo da Sacola</h4>
            </div>
            <div className="p-6 space-y-4">
                {order.order_items_json.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                        <div className="flex-1">
                            <p className="text-sm font-black text-gray-800">
                                {item.quantity}x {item.name}
                            </p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase">{item.size}</p>
                            {item.flavors && item.flavors.length > 0 && (
                                <p className="text-[9px] text-gray-400 italic">Sabores: {item.flavors.join(' / ')}</p>
                            )}
                        </div>
                        <p className="text-sm font-black text-gray-700">R$ {(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                ))}
                
                <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                        <span>Subtotal</span>
                        <span>R$ {(order.total_amount - (order.total_amount * 0.1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                        <span>Taxa de Entrega</span>
                        <span className="text-green-600">Calculada</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                        <span className="text-sm font-black text-gray-800 uppercase italic">Total Pago</span>
                        <span className="text-2xl font-black text-red-600 tracking-tighter">R$ {order.total_amount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* INFO ADICIONAL */}
        <div className="bg-gray-800 rounded-3xl p-6 text-white shadow-xl flex items-center justify-between">
            <div>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Pagamento via</p>
                <p className="font-bold text-sm uppercase tracking-widest">{order.payment_method}</p>
            </div>
            <a 
                href={`https://wa.me/55${order.pizzarias.whatsapp.replace(/\D/g, '')}`} 
                className="bg-green-600 p-3 rounded-2xl hover:bg-green-700 transition active:scale-90"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
            </a>
        </div>
      </div>

      <p className="mt-12 text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] text-center">Powered by Horizon AJ</p>
    </div>
  )
}