// app/acompanhar/[id]/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface Order {
  id: string
  order_number: number
  customer_name: string
  customer_phone: string
  delivery_address: string | null
  payment_method: string
  total_amount: number
  delivery_zone_price: number
  status: 'pending' | 'preparing' | 'delivering' | 'delivered' | 'canceled'
  order_items_json: any[]
  cancellation_reason: string | null
  created_at: string
  confirmed_at: string | null
  preparing_at: string | null
  delivering_at: string | null
  delivered_at: string | null
  canceled_at: string | null
  pizzaria: {
    name: string
    logo_url: string | null
    primary_color: string | null
    whatsapp_number: string
  }
}

const STATUS_STEPS = [
  {
    key: 'pending',
    label: 'Pedido Recebido',
    description: 'Aguardando confirmação da loja',
    icon: '🧾',
    timestampKey: 'created_at',
  },
  {
    key: 'preparing',
    label: 'Em Preparo',
    description: 'Seu pedido está sendo preparado',
    icon: '👨‍🍳',
    timestampKey: 'preparing_at',
  },
  {
    key: 'delivering',
    label: 'Saiu para Entrega',
    description: 'O entregador está a caminho',
    icon: '🛵',
    timestampKey: 'delivering_at',
  },
  {
    key: 'delivered',
    label: 'Entregue',
    description: 'Pedido entregue com sucesso!',
    icon: '✅',
    timestampKey: 'delivered_at',
  },
]

const STATUS_ORDER = ['pending', 'preparing', 'delivering', 'delivered']

function formatTime(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export default function AcompanharPage() {
  const { id } = useParams<{ id: string }>()
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/track/${id}`)
      if (!res.ok) throw new Error('Pedido não encontrado.')
      const data = await res.json()
      setOrder(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOrder()
    // Polling a cada 30s para atualizar status automaticamente
    const interval = setInterval(fetchOrder, 30_000)
    return () => clearInterval(interval)
  }, [fetchOrder])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Buscando seu pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-lg font-black text-gray-900 mb-2">Pedido não encontrado</h1>
          <p className="text-sm text-gray-400">{error || 'Verifique o link e tente novamente.'}</p>
        </div>
      </div>
    )
  }

  const isCanceled = order.status === 'canceled'
  const currentStepIndex = STATUS_ORDER.indexOf(order.status)
  const primaryColor = order.pizzaria.primary_color || '#dc2626'

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Header da loja */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow shrink-0 overflow-hidden"
            style={{ backgroundColor: primaryColor }}
          >
            {order.pizzaria.logo_url ? (
              <img src={order.pizzaria.logo_url} alt="" className="w-full h-full object-cover" />
            ) : '🍕'}
          </div>
          <div>
            <h1 className="font-black text-gray-900 text-base leading-tight">{order.pizzaria.name}</h1>
            <p className="text-xs text-gray-400">Pedido #{order.order_number} • {formatDate(order.created_at)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* ── STATUS CANCELADO ── */}
        {isCanceled ? (
          <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
            <div className="bg-red-50 px-5 py-4 flex items-center gap-3">
              <span className="text-3xl">❌</span>
              <div>
                <h2 className="font-black text-red-700 text-base">Pedido Cancelado</h2>
                <p className="text-xs text-red-500 mt-0.5">
                  {formatDate(order.canceled_at)} às {formatTime(order.canceled_at)}
                </p>
              </div>
            </div>
            {order.cancellation_reason && (
              <div className="px-5 py-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Motivo</p>
                <p className="text-sm text-gray-700 font-medium">{order.cancellation_reason}</p>
              </div>
            )}
            <div className="px-5 pb-5">
              <a
                href={`https://wa.me/55${order.pizzaria.whatsapp_number.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.849L.057 23.01a.75.75 0 00.931.932l5.264-1.53A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.698-.504-5.244-1.385l-.376-.218-3.124.909.928-3.032-.237-.389A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
                </svg>
                Falar com a loja
              </a>
            </div>
          </div>
        ) : (
          /* ── TIMELINE ── */
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">
                Acompanhe seu Pedido
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Atualiza automaticamente a cada 30 segundos</p>
            </div>

            <div className="px-5 py-5">
              <div className="relative">
                {/* Linha vertical de fundo */}
                <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gray-100" />

                {/* Linha de progresso colorida */}
                <div
                  className="absolute left-5 top-6 w-0.5 transition-all duration-700"
                  style={{
                    backgroundColor: primaryColor,
                    height: currentStepIndex === 0 ? '0%'
                      : currentStepIndex === 1 ? '33%'
                      : currentStepIndex === 2 ? '66%'
                      : '100%',
                  }}
                />

                <div className="space-y-6">
                  {STATUS_STEPS.map((step, index) => {
                    const isDone = index <= currentStepIndex
                    const isCurrent = index === currentStepIndex
                    const timestamp = order[step.timestampKey as keyof Order] as string | null

                    return (
                      <div key={step.key} className="relative flex items-start gap-4">
                        {/* Ícone */}
                        <div
                          className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0 transition-all duration-300 ${
                            isDone
                              ? 'shadow-md'
                              : 'bg-gray-100 grayscale opacity-40'
                          }`}
                          style={isDone ? { backgroundColor: `${primaryColor}20`, border: `2px solid ${primaryColor}` } : {}}
                        >
                          {step.icon}
                        </div>

                        {/* Texto */}
                        <div className="flex-1 min-w-0 pt-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm font-black ${isDone ? 'text-gray-900' : 'text-gray-300'}`}>
                              {step.label}
                            </p>
                            {timestamp && (
                              <span className="text-[10px] text-gray-400 font-medium shrink-0">
                                {formatTime(timestamp)}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs mt-0.5 ${isCurrent ? 'text-gray-500 font-medium' : 'text-gray-300'}`}>
                            {isCurrent ? step.description : isDone ? 'Concluído' : step.description}
                          </p>

                          {/* Animação pulsante no passo atual */}
                          {isCurrent && order.status !== 'delivered' && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span
                                className="w-1.5 h-1.5 rounded-full animate-pulse"
                                style={{ backgroundColor: primaryColor }}
                              />
                              <span className="text-[10px] font-bold" style={{ color: primaryColor }}>
                                Em andamento
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── RESUMO DO PEDIDO ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Resumo do Pedido</h2>
          </div>
          <div className="px-5 py-4 space-y-3">

            {/* Itens */}
            <ul className="space-y-2">
              {(order.order_items_json as any[]).map((item, idx) => (
                <li key={idx} className="flex items-start justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.size}</p>
                    {item.observation && (
                      <p className="text-xs text-orange-500">Obs: {item.observation}</p>
                    )}
                  </div>
                  <span className="text-sm font-bold text-gray-700 shrink-0">
                    R$ {Number(item.price).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 pt-3 space-y-1.5">
              {/* Endereço */}
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{order.delivery_address || 'Retirada no local'}</span>
              </div>

              {/* Pagamento */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <svg className="w-3.5 h-3.5 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="uppercase font-medium">{order.payment_method}</span>
              </div>

              {/* Subtotal + entrega + total */}
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span>
                  <span>R$ {(order.total_amount - order.delivery_zone_price).toFixed(2)}</span>
                </div>
                {order.delivery_zone_price > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Taxa de entrega</span>
                    <span>R$ {order.delivery_zone_price.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total</span>
                  <span style={{ color: primaryColor }}>R$ {order.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTATO ── */}
        <a
          href={`https://wa.me/55${order.pizzaria.whatsapp_number.replace(/\D/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-green-100 transition active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.849L.057 23.01a.75.75 0 00.931.932l5.264-1.53A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.698-.504-5.244-1.385l-.376-.218-3.124.909.928-3.032-.237-.389A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Falar com {order.pizzaria.name}
        </a>

        <p className="text-center text-[10px] text-gray-300 pb-4">
          Pedido #{order.order_number} • {formatDate(order.created_at)} às {formatTime(order.created_at)}
        </p>
      </div>
    </div>
  )
}