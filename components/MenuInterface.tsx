'use client'

import { useState } from 'react'
import { Pizzaria, Category, Product, DeliveryZone } from '@/types/database'
import ProductModal from './ProductModal'
import CheckoutModal, { CheckoutData } from './CheckoutModal'
import { supabase } from '@/lib/supabase'

interface MenuProps {
  pizzaria: Pizzaria
  categories: Category[]
  products: Product[]
  deliveryZones: DeliveryZone[]
}

export default function MenuInterface({ pizzaria, categories, products, deliveryZones }: MenuProps) {
  const [cart, setCart] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || '')

  const openProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleAddToCart = (item: any) => {
    setCart([...cart, item])
    setIsModalOpen(false)
  }

  const handleRemoveFromCart = (indexToRemove: number) => {
    setCart((prevCart) => prevCart.filter((_, index) => index !== indexToRemove))
  }

  const cartTotal = cart.reduce((acc, item) => acc + Number(item.price), 0)

  const startCheckout = () => {
    if (cart.length === 0) return
    setIsCheckoutOpen(true)
  }

  const handleSendOrder = async (data: CheckoutData) => {
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
      order_items_json: cart
    }

    try {
      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single()

      if (error) {
        console.error('Erro detalhado:', JSON.stringify(error, null, 2))
        alert('Erro ao processar pedido.')
        return
      }

      const orderNumber = newOrder.order_number
      
      let message = `*PEDIDO #${orderNumber} - ${pizzaria.name}*\n`
      message += `--------------------------------\n`
      message += `👤 *Cliente:* ${data.customerName}\n`
      message += `📞 *Tel:* ${data.customerPhone}\n\n`
      
      message += `*🛒 ITENS:*\n`
      cart.forEach(item => {
        message += `• ${item.name} (${item.size})\n`
        if (item.flavors && item.flavors.length > 0) {
           message += `  + ${item.flavors.join(' e ')}\n`
        }
        if(item.observation) message += `  _Obs: ${item.observation}_\n`
        message += `  R$ ${item.price.toFixed(2)}\n`
      })
      
      message += `\n--------------------------------\n`
      message += `📍 *ENTREGA:*\n`
      if (data.deliveryZone) {
        message += `Bairro: ${data.deliveryZone.neighborhood_name} (+R$ ${deliveryPrice.toFixed(2)})\n`
        message += `Endereço: ${data.address}\n`
      } else {
        message += `Retirada no Local\n`
      }

      message += `\n💰 *PAGAMENTO:*\n`
      message += `Forma: ${data.paymentMethod.toUpperCase()}\n`
      if (data.paymentMethod === 'dinheiro' && data.changeFor) {
        message += `Troco para: R$ ${data.changeFor}\n`
      }
      
      message += `\n*TOTAL: R$ ${finalTotal.toFixed(2)}*`

      const url = `https://wa.me/${pizzaria.whatsapp_number}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
      
      setCart([])
      setIsCheckoutOpen(false)

    } catch (err) {
      console.error('Erro:', err)
      alert('Erro inesperado.')
    }
  }

  const activeCategory = categories.find(c => c.id === activeCategoryId)
  const displayedProducts = products.filter(p => p.category_id === activeCategoryId)

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      
      {/* CORREÇÃO 1: Removi o 'pb-28 md:pb-32' daqui. 
          Agora o fundo branco acaba exatamente onde o rodapé preto começa.
      */}
      <div className="flex-1 flex flex-col w-full">
        
        {/* WRAPPER FIXO (CABEÇALHO + ABAS) */}
        <div className="sticky top-0 z-30 shadow-md bg-white">
            <div className="bg-red-600 p-4 text-white flex flex-col items-center transition-all">
                {pizzaria.logo_url ? (
                <div className="bg-white p-1 rounded-full shadow-lg mb-2">
                    <img src={pizzaria.logo_url} alt={pizzaria.name} className="w-20 h-20 rounded-full object-cover" />
                </div>
                ) : null}
                <h1 className="text-xl font-bold text-center">{pizzaria.name}</h1>
            </div>

            <div className="bg-white px-4 py-3 overflow-x-auto flex gap-2 no-scrollbar border-b">
                {categories.map((cat) => (
                <button
                    key={cat.id}
                    onClick={() => setActiveCategoryId(cat.id)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    activeCategoryId === cat.id
                        ? 'bg-red-600 text-white shadow-md transform scale-105'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    {cat.name}
                </button>
                ))}
            </div>
        </div>

        {/* LISTA DE PRODUTOS */}
        <div className="max-w-md mx-auto p-4 space-y-4 w-full mb-8">
            <h2 className="text-lg font-bold text-gray-700 pl-1 border-l-4 border-red-500 ml-1 mt-4">
            {activeCategory?.name}
            </h2>

            {displayedProducts.length === 0 && (
            <div className="text-center py-12 space-y-3 opacity-60">
                <span className="text-4xl block">🍽️</span>
                <p className="italic">Nenhum item nesta categoria.</p>
            </div>
            )}

            {displayedProducts.map((product) => (
            <div 
                key={product.id} 
                onClick={() => openProduct(product)}
                className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center cursor-pointer hover:border-red-200 transition active:scale-[0.98]"
            >
                {product.image_url ? (
                <img src={product.image_url} className="w-20 h-20 rounded-lg object-cover mr-4 bg-gray-100 shrink-0" />
                ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center mr-4 text-2xl shrink-0">🍕</div>
                )}

                <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-800 leading-tight truncate">{product.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                <span className="text-green-700 font-bold text-sm mt-2 block">
                    {product.product_prices && product.product_prices.length > 0
                    ? `A partir de R$ ${Math.min(...product.product_prices.map(p => p.price)).toFixed(2)}` 
                    : 'Indisponível'}
                </span>
                </div>
                <button className="ml-2 bg-red-50 text-red-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg shrink-0">+</button>
            </div>
            ))}
        </div>

        {/* RODAPÉ PRETO 
            CORREÇÃO 2: Adicionei 'pb-32' aqui. 
            O fundo preto agora vai se estender para baixo, cobrindo a área atrás do botão do carrinho.
        */}
        <div className="mt-auto pt-12 pb-32 px-8 bg-gray-800 text-gray-400 text-center text-sm w-full">
            <h3 className="font-bold text-white mb-2 text-lg">{pizzaria.name}</h3>
            {pizzaria.address ? (
            <p className="whitespace-pre-line leading-relaxed max-w-md mx-auto">{pizzaria.address}</p>
            ) : (
            <p>Endereço não cadastrado.</p>
            )}
            
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-xs opacity-50 mb-1">Desenvolvido por</p>
              <a 
                href="https://wa.me/5571993570954" 
                target="_blank" 
                rel="noopener noreferrer"
                className="font-bold text-gray-300 text-xs uppercase tracking-wider hover:text-white hover:underline transition"
              >
                Horizon AJ Desenvolvimento
              </a>
            </div>
        </div>

      </div>

      {/* FOOTER FIXO (CARRINHO) */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-md mx-auto flex justify-between items-center animate-in slide-in-from-bottom-2 duration-300">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total do Pedido</p>
              <div className="flex items-baseline gap-1">
                 <p className="font-bold text-gray-900 text-xl">R$ {cartTotal.toFixed(2)}</p>
                 <span className="text-xs text-gray-400">/ {cart.length} itens</span>
              </div>
            </div>
            <button onClick={startCheckout} className="bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transition flex items-center gap-2 transform active:scale-95">
              <span>Ver Sacola</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
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
        cartTotal={cartTotal}
        cartItems={cart}
        onRemoveItem={handleRemoveFromCart}
        onConfirm={handleSendOrder}
      />
    </div>
  )
}