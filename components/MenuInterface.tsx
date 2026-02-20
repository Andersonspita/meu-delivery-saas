'use client'

import { useState, useEffect } from 'react'
import { Pizzaria, Category, Product, DeliveryZone } from '@/types/database'
import ProductModal from './ProductModal'
import CheckoutModal, { CheckoutData } from './CheckoutModal'
import { createValidatedOrder } from '@/app/actions/order' 
import { useCart } from '@/hooks/useCart'

interface MenuProps {
  pizzaria: Pizzaria
  categories: Category[]
  products: Product[]
  deliveryZones: DeliveryZone[]
  operatingHours: any[]
}

export default function MenuInterface({ pizzaria, categories, products, deliveryZones, operatingHours }: MenuProps) {
  const { cart, addToCart, removeFromCart, updateQuantity, clearCart, isLoaded: cartLoaded } = useCart(pizzaria.id)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || '')
  
  const [isOpen, setIsOpen] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    const checkStatus = () => {
      if (!operatingHours || operatingHours.length === 0) return true 

      const now = new Date()
      const day = now.getDay() 
      const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes()
      
      const todayHours = operatingHours.find(h => h.day_of_week === day)
      
      if (!todayHours || todayHours.is_closed) return false

      try {
        const [openH, openM] = todayHours.opening_time.split(':').map(Number)
        const [closeH, closeM] = todayHours.closing_time.split(':').map(Number)
        
        const openTime = openH * 60 + openM
        let closeTime = closeH * 60 + closeM

        if (closeTime === 0) closeTime = 1440

        if (closeTime < openTime) {
          return currentTimeInMinutes >= openTime || currentTimeInMinutes <= closeTime
        }

        return currentTimeInMinutes >= openTime && currentTimeInMinutes <= closeTime
      } catch (e) {
        return true
      }
    }

    setIsOpen(checkStatus())
  }, [operatingHours])

  const handleProductClick = (product: Product) => {
    if (!isOpen) return
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleAddToCart = (item: any) => {
    if (!isOpen) return alert('Puxa! A cozinha acabou de fechar.')
    addToCart({ ...item, id: crypto.randomUUID(), quantity: 1 })
    setIsModalOpen(false)
  }

  const handleSendOrder = async (data: CheckoutData) => {
    if (isSubmitting || !isOpen) return
    setIsSubmitting(true)
    try {
      const result = await createValidatedOrder(pizzaria.id, data, cart)
      if (result.success) {
        alert(`🚀 Pedido enviado com sucesso!`)
        clearCart()
        setIsCheckoutOpen(false)
      } else {
        alert(`Erro: ${result.error}`)
      }
    } catch (err) { 
        console.error(err)
        alert('Erro ao enviar pedido.') 
    } finally { 
        setIsSubmitting(false) 
    }
  }

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const displayedProducts = products.filter(p => p.category_id === activeCategoryId)

  if (!isMounted) return <div className="min-h-screen bg-gray-50" />

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      
      {!isOpen && (
        <div className="bg-amber-500 text-white p-3 text-center sticky top-0 z-[100] font-black uppercase text-[10px] tracking-widest shadow-lg">
          ⚠️ ESTAMOS FECHADOS NO MOMENTO. CONSULTE NOSSOS HORÁRIOS.
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-30 shadow-md bg-white">
        <div className="bg-red-600 p-6 text-white flex flex-col items-center">
          {pizzaria.logo_url && (
            <div className="bg-white p-1 rounded-full shadow-2xl mb-3">
              <img src={pizzaria.logo_url} className="w-16 h-16 rounded-full object-cover" alt="Logo" />
            </div>
          )}
          <h1 className="text-xl font-black uppercase tracking-tighter italic">{pizzaria.name}</h1>
        </div>

        {/* CATEGORIAS */}
        <div className="bg-white px-4 py-4 overflow-x-auto flex gap-3 no-scrollbar border-b">
          {categories.map((cat) => (
            <button 
              key={cat.id} 
              onClick={() => setActiveCategoryId(cat.id)} 
              className={`whitespace-nowrap px-6 py-2 rounded-2xl text-[10px] font-black uppercase transition-all ${
                activeCategoryId === cat.id ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* PRODUTOS */}
      <main className="max-w-md mx-auto p-4 space-y-6 w-full mb-32">
        {displayedProducts.map((product) => (
          <div 
            key={product.id} 
            onClick={() => handleProductClick(product)}
            className={`bg-white p-4 rounded-3xl border flex items-center transition ${
              !isOpen ? 'opacity-50 grayscale cursor-not-allowed' : 'active:scale-95 shadow-sm hover:shadow-md'
            }`}
          >
            {product.image_url ? (
                <img src={product.image_url} className="w-20 h-20 rounded-2xl object-cover mr-4 shadow-sm" />
            ) : (
                <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mr-4 text-3xl shadow-inner">🍕</div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-gray-800 leading-tight uppercase text-sm">{product.name}</h3>
              <p className="text-[10px] text-gray-400 line-clamp-2 mt-1">{product.description}</p>
              <div className="mt-2 text-green-600 font-black text-sm">
                A partir de R$ {(product.product_prices && product.product_prices.length > 0) 
                  ? Math.min(...product.product_prices.map(p => p.price)).toFixed(2) 
                  : '0.00'}
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* FOOTER CARRINHO */}
      {cartLoaded && cart.length > 0 && isOpen && (
        <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t p-5 shadow-2xl z-50 animate-in slide-in-from-bottom">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div className="text-gray-900">
              <p className="text-[10px] uppercase text-gray-400 font-black mb-1 leading-none">Subtotal</p>
              <p className="text-2xl font-black tracking-tighter">R$ {cartTotal.toFixed(2)}</p>
            </div>
            <button 
              onClick={() => setIsCheckoutOpen(true)} 
              className="bg-green-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-green-100 uppercase text-xs tracking-widest active:scale-95 transition-transform"
            >
              Pedir Agora
            </button>
          </div>
        </div>
      )}

      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct}
        allProducts={products}
        onAddToCart={handleAddToCart}
      />
      
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        deliveryZones={deliveryZones}
        cartItems={cart}
        onRemoveItem={removeFromCart}
        onUpdateQuantity={updateQuantity}
        onConfirm={handleSendOrder}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}