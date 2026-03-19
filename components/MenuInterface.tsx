'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Pizzaria, Category, Product, DeliveryZone } from '@/types/database'
import ProductModal from './ProductModal'
import CheckoutModal, { CheckoutData } from './CheckoutModal'

interface MenuProps {
  pizzaria: Pizzaria
  categories: Category[]
  products: Product[]
  deliveryZones: DeliveryZone[]
}

interface CartItem {
  id?: string
  name: string
  size: string
  price: number
  flavors?: string[]
  observation?: string
  _cartKey: string
}

interface Toast {
  id: number
  message: string
  emoji: string
}

function useScrollSpy(categoryIds: string[]) {
  const [activeId, setActiveId] = useState(categoryIds[0] ?? '')
  useEffect(() => {
    if (categoryIds.length === 0) return
    const observers: IntersectionObserver[] = []
    categoryIds.forEach(id => {
      const el = document.getElementById(`section-${id}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveId(id) },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [categoryIds])
  return { activeId, setActiveId }
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3 fade-in duration-300">
          <span>{t.emoji}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  )
}

function InfoModal({ isOpen, onClose, pizzaria, deliveryZones }: {
  isOpen: boolean; onClose: () => void; pizzaria: Pizzaria; deliveryZones: DeliveryZone[]
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-[91] w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Informações</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-5 py-4 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{pizzaria.name}</h3>
            {pizzaria.address && (
              <p className="text-sm text-gray-500 mt-1 flex items-start gap-1.5">
                <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                {pizzaria.address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-2xl">
            <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.849L.057 23.01a.75.75 0 00.931.932l5.264-1.53A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.698-.504-5.244-1.385l-.376-.218-3.124.909.928-3.032-.237-.389A9.956 9.956 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pedidos via WhatsApp</p>
              <p className="text-sm font-semibold text-gray-900">{pizzaria.whatsapp_number}</p>
            </div>
          </div>
          {deliveryZones.filter(z => z.active).length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-3">Taxas de entrega por bairro</h4>
              <div className="space-y-2">
                {deliveryZones.filter(z => z.active).map(zone => (
                  <div key={zone.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                    <span className="text-sm text-gray-700">{zone.neighborhood_name}</span>
                    <span className={`text-sm font-semibold ${zone.price === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {zone.price === 0 ? 'Gratis' : `R$ ${zone.price.toFixed(2)}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
            <div className="w-9 h-9 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-sm text-gray-700">Retirada no local tambem disponivel</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CartDrawer({ isOpen, onClose, cart, onIncrease, onDecrease, onRemove, cartTotal, onCheckout }: {
  isOpen: boolean; onClose: () => void; cart: CartItem[]
  onIncrease: (key: string) => void; onDecrease: (key: string) => void
  onRemove: (key: string) => void; cartTotal: number; onCheckout: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const grouped = cart.reduce<Record<string, CartItem & { count: number; totalPrice: number }>>((acc, item) => {
    const key = item._cartKey
    if (!acc[key]) acc[key] = { ...item, count: 1, totalPrice: item.price }
    else { acc[key].count++; acc[key].totalPrice += item.price }
    return acc
  }, {})
  const groupedItems = Object.values(grouped)

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
      <div className={`fixed bottom-0 left-0 right-0 z-[61] bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ease-out max-h-[85vh] flex flex-col ${isOpen ? 'translate-y-0' : 'translate-y-full'}`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">Sua sacola</h2>
            <p className="text-xs text-gray-400">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</p>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); onClose() }} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {groupedItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-sm text-gray-500 font-medium">Sua sacola esta vazia</p>
            </div>
          )}
          {groupedItems.map(item => (
            <div key={item._cartKey} className="flex items-start gap-3 p-3 bg-gray-50 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center text-xl shrink-0 border border-gray-100">🍕</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">{item.size}</p>
                {item.flavors && item.flavors.length > 0 && <p className="text-xs text-gray-400 truncate">1/2 {item.flavors.join(' • 1/2 ')}</p>}
                {item.observation && <p className="text-xs text-orange-600 truncate">Obs: {item.observation}</p>}
                <p className="text-sm font-bold text-red-600 mt-1">R$ {item.totalPrice.toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={(e) => { e.stopPropagation(); item.count > 1 ? onDecrease(item._cartKey) : onRemove(item._cartKey) }} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition active:scale-90">
                  {item.count > 1 ? <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                    : <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                </button>
                <span className="text-sm font-bold text-gray-900 w-4 text-center">{item.count}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); onIncrease(item._cartKey) }} className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center hover:bg-red-600 transition active:scale-90 shadow-sm">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div className="px-5 pb-6 pt-3 border-t border-gray-100 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-sm font-bold text-gray-900">R$ {cartTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-400 -mt-1">+ taxa de entrega calculada no checkout</p>
            <button type="button" onClick={(e) => { e.stopPropagation(); onClose(); onCheckout() }} className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-2xl py-4 text-base font-semibold shadow-lg transition-all">
              Ir para o checkout
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function ProductCard({ product, onClick }: { product: Product; onClick: () => void }) {
  const minPrice = product.product_prices?.length ? Math.min(...product.product_prices.map(p => p.price)) : null
  return (
    <div onClick={onClick} className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer transition-all duration-150 p-4 group">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 leading-snug mb-1 group-hover:text-red-600 transition-colors">{product.name}</h3>
        {product.description && <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-2">{product.description}</p>}
        <div className="flex items-center gap-2 flex-wrap">
          {minPrice !== null ? (
            <span className="text-sm font-bold text-gray-900">A partir de <span className="text-red-600">R$ {minPrice.toFixed(2)}</span></span>
          ) : <span className="text-xs text-gray-400">Indisponivel</span>}
          {product.allows_half_half && <span className="text-[10px] font-medium text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5">1/2 a 1/2</span>}
        </div>
      </div>
      <div className="shrink-0 relative">
        {product.image_url ? <img src={product.image_url} alt={product.name} className="w-24 h-24 rounded-xl object-cover border border-gray-100" />
          : <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center text-3xl border border-gray-100">🍕</div>}
        <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
        </div>
      </div>
    </div>
  )
}

export default function MenuInterface({ pizzaria, categories, products, deliveryZones }: MenuProps) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false)
  const [isInfoOpen, setIsInfoOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [toasts, setToasts] = useState<Toast[]>([])
  const categoryBarRef = useRef<HTMLDivElement>(null)
  const categoryIds = categories.map(c => c.id)
  const { activeId: activeCategoryId, setActiveId: setActiveCategoryId } = useScrollSpy(categoryIds)

  const showToast = (message: string, emoji = '✅') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, emoji }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2500)
  }

  useEffect(() => {
    const bar = categoryBarRef.current
    if (!bar) return
    const btn = bar.querySelector(`[data-cat="${activeCategoryId}"]`) as HTMLElement
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeCategoryId])

  const scrollToCategory = (id: string) => {
    setActiveCategoryId(id)
    const el = document.getElementById(`section-${id}`)
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 110, behavior: 'smooth' })
  }

  const openProduct = (product: Product) => { setSelectedProduct(product); setIsModalOpen(true) }

  const handleAddToCart = (item: any) => {
    const cartKey = `${item.name}-${item.size}-${(item.flavors ?? []).join(',')}`
    const qty = item.quantity || 1
    const newItems = Array.from({ length: qty }, () => ({ ...item, _cartKey: cartKey }))
    setCart(prev => [...prev, ...newItems])
    setIsModalOpen(false)
    showToast(`${item.name} adicionado!`, '🛒')
  }

  const handleIncrease = useCallback((key: string) => {
    setCart(prev => { const source = prev.find(i => i._cartKey === key); return source ? [...prev, { ...source }] : prev })
  }, [])

  const handleDecrease = useCallback((key: string) => {
    setCart(prev => {
      const idx = [...prev].reverse().findIndex(i => i._cartKey === key)
      if (idx === -1) return prev
      return prev.filter((_, i) => i !== prev.length - 1 - idx)
    })
  }, [])

  const handleRemoveGroup = useCallback((key: string) => {
    setCart(prev => prev.filter(i => i._cartKey !== key))
    showToast('Item removido', '🗑️')
  }, [])

  const handleRemoveFromCart = (indexToRemove: number) => {
    setCart(prev => prev.filter((_, i) => i !== indexToRemove))
  }

  const cartTotal = cart.reduce((acc, item) => acc + Number(item.price), 0)
  const startCheckout = () => { if (cart.length === 0) return; setIsCheckoutOpen(true) }

  // ── Envio do pedido com link de rastreamento ──
  const handleSendOrder = async (data: any) => { // Mudamos CheckoutData para any aqui
  const deliveryPrice = data.deliveryZone ? Number(data.deliveryZone.price) : 0
    const finalTotal = cartTotal + deliveryPrice

    const orderPayload = {
      pizzaria_id: pizzaria.id,
      customer_name: data.customerName,
      customer_phone: data.customerPhone,
      delivery_address: data.deliveryZone
        ? `${data.address} - ${data.deliveryZone.neighborhood_name}`
        : 'Retirada no Local',
      delivery_zone_price: deliveryPrice,
      payment_method: data.paymentMethod,
      total_amount: finalTotal,
      status: 'pending',
      order_items_json: cart,
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })
      if (!response.ok) throw new Error('Falha ao registrar pedido no banco de dados.')

      const newOrder = await response.json()
      const orderNumber = newOrder.order_number
      const orderId = newOrder.id

      // Link de rastreamento
      const trackingUrl = `${window.location.origin}/acompanhar/${orderId}`

      // Monta mensagem com taxa de entrega e link de rastreamento
      let message = `*PEDIDO #${orderNumber} - ${pizzaria.name}*\n`
      message += `--------------------------------\n`
      message += `*Cliente:* ${data.customerName}\n`
      message += `*Tel:* ${data.customerPhone}\n\n`
      message += `*ITENS:*\n`
      cart.forEach(item => {
        message += `- ${item.name} (${item.size})\n`
        if (item.flavors && item.flavors.length > 0) message += `  Sabores: ${item.flavors.join(' e ')}\n`
        if (item.observation) message += `  Obs: ${item.observation}\n`
        message += `  R$ ${Number(item.price).toFixed(2)}\n`
      })
      message += `\n--------------------------------\n`
      message += `*ENTREGA:*\n`
      if (data.deliveryZone) {
        message += `Bairro: ${data.deliveryZone.neighborhood_name}\n`
        message += `Taxa: R$ ${deliveryPrice.toFixed(2)}\n`
        message += `Endereco: ${data.address}\n`
      } else {
        message += `Retirada no Local\n`
        message += `Taxa: Gratis\n`
      }
      message += `\n*PAGAMENTO:*\n`
      message += `Forma: ${data.paymentMethod.toUpperCase()}\n`
      if (data.paymentMethod === 'dinheiro' && data.changeFor) {
        message += `Troco para: R$ ${data.changeFor}\n`
      }
      message += `\n--------------------------------\n`
      message += `*Subtotal:* R$ ${cartTotal.toFixed(2)}\n`
      message += `*Taxa entrega:* R$ ${deliveryPrice.toFixed(2)}\n`
      message += `*TOTAL: R$ ${finalTotal.toFixed(2)}*\n`
      message += `\n--------------------------------\n`
      message += `*Acompanhe seu pedido:*\n`
      message += `${trackingUrl}`

      const url = `https://wa.me/${pizzaria.whatsapp_number}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')

      setCart([])
      setIsCheckoutOpen(false)
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao processar pedido. Tente novamente.')
    }
  }

  const isSearching = searchQuery.trim().length > 0
  const searchResults = isSearching
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  return (
    <div className="min-h-screen bg-[#f5f5f5] pb-32 font-sans">
      <ToastContainer toasts={toasts} />

      {/* HERO */}
      <div className="relative w-full">
        <div className="h-44 w-full bg-gradient-to-br from-red-700 via-red-600 to-orange-500"
          style={{ backgroundImage: pizzaria.banner_url ? `url(${pizzaria.banner_url})` : undefined, backgroundSize: 'cover', backgroundPosition: 'center' }} />
        <div className="absolute inset-0 h-44 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <button onClick={() => setIsInfoOpen(true)} className="absolute top-3 right-4 w-9 h-9 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 hover:bg-black/50 transition">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </button>
        <div className="relative max-w-2xl mx-auto px-4 -mt-14 z-10">
          <div className="bg-white rounded-2xl shadow-lg px-4 py-4 flex items-center gap-4">
            {pizzaria.logo_url ? <img src={pizzaria.logo_url} alt={pizzaria.name} className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow shrink-0" />
              : <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-400 flex items-center justify-center text-3xl shadow shrink-0">🍕</div>}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">{pizzaria.name}</h1>
              {pizzaria.address && <p className="text-xs text-gray-400 mt-0.5 truncate">{pizzaria.address}</p>}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Aberto agora
                </span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  30-50 min
                </span>
                <button onClick={() => setIsInfoOpen(true)} className="text-xs text-red-500 font-medium hover:underline">Ver taxas</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BUSCA */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Buscar no cardapio..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 shadow-sm transition" />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* BUSCA RESULTADOS */}
      {isSearching && (
        <div className="max-w-2xl mx-auto px-4 mt-4 space-y-3">
          <p className="text-xs text-gray-400">{searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} para "{searchQuery}"</p>
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center"><div className="text-5xl mb-3">🔍</div><p className="text-sm text-gray-500 font-medium">Nenhum item encontrado</p></div>
          ) : searchResults.map(p => <ProductCard key={p.id} product={p} onClick={() => openProduct(p)} />)}
        </div>
      )}

      {/* CATEGORIAS + SEÇÕES */}
      {!isSearching && (
        <>
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm mt-4">
            <div ref={categoryBarRef} className="max-w-2xl mx-auto px-4 overflow-x-auto flex gap-1 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
              {categories.map(cat => (
                <button key={cat.id} data-cat={cat.id} onClick={() => scrollToCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-3.5 text-sm font-medium transition-all border-b-2 ${activeCategoryId === cat.id ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
          <div className="max-w-2xl mx-auto px-4 mt-5 space-y-8">
            {categories.map(cat => {
              const catProducts = products.filter(p => p.category_id === cat.id)
              if (catProducts.length === 0) return null
              return (
                <div key={cat.id} id={`section-${cat.id}`}>
                  <h2 className="text-base font-bold text-gray-900 mb-3">{cat.name}</h2>
                  <div className="space-y-3">{catProducts.map(p => <ProductCard key={p.id} product={p} onClick={() => openProduct(p)} />)}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* BOTÃO CARRINHO */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full z-30 px-4 pb-5 pt-3">
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setIsCartDrawerOpen(true)}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white rounded-2xl shadow-xl transition-all duration-200 flex items-center justify-between px-5 py-4">
              <span className="w-7 h-7 bg-red-800/40 rounded-lg flex items-center justify-center text-sm font-bold">{cart.length}</span>
              <span className="text-base font-semibold">Ver sacola</span>
              <span className="text-base font-bold">R$ {cartTotal.toFixed(2)}</span>
            </button>
          </div>
        </div>
      )}

      <CartDrawer isOpen={isCartDrawerOpen} onClose={() => setIsCartDrawerOpen(false)} cart={cart}
        onIncrease={handleIncrease} onDecrease={handleDecrease} onRemove={handleRemoveGroup}
        cartTotal={cartTotal} onCheckout={startCheckout} />
      <InfoModal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} pizzaria={pizzaria} deliveryZones={deliveryZones} />
      <ProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} product={selectedProduct}
        allProducts={products} onAddToCart={handleAddToCart} />
      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} deliveryZones={deliveryZones}
        cartTotal={cartTotal} cartItems={cart} onRemoveItem={handleRemoveFromCart} onConfirm={handleSendOrder} />
    </div>
  )
}