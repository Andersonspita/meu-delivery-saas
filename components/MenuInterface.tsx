// components/MenuInterface.tsx
'use client'

import { supabase } from '@/lib/supabase'
import { useState } from 'react'
import { Pizzaria, Category, Product, DeliveryZone } from '@/types/database'
import ProductModal from './ProductModal'
import CheckoutModal, { CheckoutData } from './CheckoutModal'

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
  
  // Estado do Checkout
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  const openProduct = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleAddToCart = (item: any) => {
    setCart([...cart, item])
    setIsModalOpen(false)
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
        console.error('Erro ao salvar pedido:', error)
        alert('Houve um erro ao processar seu pedido. Tente novamente.')
        return
      }

      
      const orderNumber = newOrder.order_number 
      
      let message = `*PEDIDO #${orderNumber} - ${pizzaria.name}*\n` 
      message += `--------------------------------\n`
      message += `👤 *Cliente:* ${data.customerName}\n`
      message += `📞 *Cel:* ${data.customerPhone}\n\n`
      
      message += `*🛒 ITENS DO PEDIDO:*\n`
      cart.forEach(item => {
        message += `• 1x ${item.name} (${item.size})\n`
        if(item.observation) message += `   _Obs: ${item.observation}_\n`
        message += `   R$ ${item.price.toFixed(2)}\n`
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
      
      message += `\n*TOTAL A PAGAR: R$ ${finalTotal.toFixed(2)}*`

      
      const url = `https://wa.me/${pizzaria.whatsapp_number}?text=${encodeURIComponent(message)}`
      window.open(url, '_blank')
      
      
      setCart([])
      setIsCheckoutOpen(false)
      alert(`Pedido #${orderNumber} enviado com sucesso!`)

    } catch (err) {
      console.error('Erro inesperado:', err)
      alert('Erro inesperado. Verifique sua conexão.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* CABEÇALHO */}
      <div className="bg-red-600 p-6 text-white shadow-md">
        <h1 className="text-2xl font-bold text-center">{pizzaria.name}</h1>
        <p className="text-center text-red-100 text-sm mt-1">Cardápio Digital</p>
      </div>

      {/* LISTA */}
      <div className="max-w-md mx-auto p-4 space-y-8">
        {categories.map((category) => (
          <div key={category.id}>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-red-500 pl-2">
              {category.name}
            </h2>
            <div className="space-y-4">
              {products
                .filter((p) => p.category_id === category.id)
                .map((product) => (
                  <div key={product.id} onClick={() => openProduct(product)} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center cursor-pointer hover:border-red-200 transition">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500 line-clamp-2">{product.description}</p>
                      <span className="text-green-600 font-bold text-sm mt-2 block">
                        {product.product_prices && product.product_prices.length > 0
                          ? `R$ ${Math.min(...product.product_prices.map(p => p.price)).toFixed(2)}+` 
                          : 'Indisponível'}
                      </span>
                    </div>
                    <button className="ml-4 bg-gray-100 text-red-600 w-8 h-8 rounded-full flex items-center justify-center font-bold hover:bg-red-50">+</button>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 shadow-lg z-40">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <div>
              <p className="text-xs text-gray-500">Total ({cart.length} itens)</p>
              <p className="font-bold text-gray-900 text-lg">R$ {cartTotal.toFixed(2)}</p>
            </div>
            <button onClick={startCheckout} className="bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:bg-green-700 transition flex items-center gap-2">
              <span>Finalizar</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.248-.57-.397m-5.475 7.355c-1.91 0-3.79-.538-5.424-1.507l-.389-.231-4.03.967 1.056-3.743-.228-.359c-1.077-1.685-1.646-3.633-1.646-5.643 0-5.875 4.881-10.665 10.87-10.665 2.903 0 5.633 1.135 7.685 3.196 2.052 2.06 3.184 4.801 3.184 7.711 0 5.882-4.887 10.674-10.877 10.674"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* MODALS */}
      <ProductModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        product={selectedProduct}
        onAddToCart={handleAddToCart}
      />
      
      <CheckoutModal 
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        deliveryZones={deliveryZones} 
        cartTotal={cartTotal}
        onConfirm={handleSendOrder}
      />
    </div>
  )
}