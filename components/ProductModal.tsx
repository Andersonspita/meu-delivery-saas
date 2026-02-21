'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/types/database'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  allProducts: Product[] 
  onAddToCart: (item: any) => void
  categoryName?: string
}

export default function ProductModal({ isOpen, onClose, product, allProducts, onAddToCart, categoryName }: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<any>(null)
  const [pizzaType, setPizzaType] = useState<'inteira' | 'meio-a-meio'>('inteira')
  const [secondFlavorId, setSecondFlavorId] = useState<string>('')
  const [observation, setObservation] = useState('')
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (product) {
      const prices = [...(product.product_prices || [])].sort((a, b) => Number(a.price) - Number(b.price))
      setSelectedSize(prices[0] || null)
      setPizzaType('inteira')
      setSecondFlavorId('')
      setObservation('')
      setQuantity(1)
    }
  }, [product])

  if (!isOpen || !product) return null

  const isPizza = (categoryName && categoryName.toLowerCase().includes('pizza')) || 
                  product.name.toLowerCase().includes('pizza')

  const otherFlavors = allProducts.filter(p => p.category_id === product.category_id && p.id !== product.id)

  let finalPrice = selectedSize ? Number(selectedSize.price) : 0
  let secondFlavorName = ''

  if (pizzaType === 'meio-a-meio' && secondFlavorId) {
    const secondFlavor = otherFlavors.find(f => f.id === secondFlavorId)
    if (secondFlavor) {
      secondFlavorName = secondFlavor.name
      
      // ✅ CORREÇÃO PARA A VERCEL: Garantimos que product_prices nunca será lido como undefined
      const safePrices = secondFlavor.product_prices || []
      const secondFlavorPriceObj = safePrices.find(p => p.size === selectedSize?.size)
      
      const secondFlavorPrice = secondFlavorPriceObj ? Number(secondFlavorPriceObj.price) : 0
      
      if (secondFlavorPrice > finalPrice) {
        finalPrice = secondFlavorPrice
      }
    }
  }

  const total = finalPrice * quantity

  const handleAdd = () => {
    if (!selectedSize) return alert('Selecione um tamanho.')
    if (pizzaType === 'meio-a-meio' && !secondFlavorId) return alert('Selecione o segundo sabor da pizza.')

    const itemName = pizzaType === 'meio-a-meio' 
        ? `1/2 ${product.name} + 1/2 ${secondFlavorName}` 
        : product.name

    onAddToCart({
      product_id: product.id,
      name: itemName,
      price: finalPrice,
      quantity,
      size: selectedSize.size,
      observation
    })
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 font-sans">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl">
        
        {/* IMAGEM E HEADER */}
        <div className="relative h-48 bg-gray-100 shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🍕</div>
          )}
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-md rounded-full text-gray-800 shadow-lg">
            ✕
          </button>
        </div>

        {/* CONTEÚDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter leading-none">{product.name}</h2>
            <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">{product.description}</p>
          </div>

          {/* TAMANHOS */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Escolha o Tamanho</h3>
            <div className="space-y-2">
              {(product.product_prices || []).map((priceOption) => (
                <label key={priceOption.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                  selectedSize?.id === priceOption.id ? 'border-red-600 bg-red-50/50' : 'border-gray-100 hover:border-gray-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="size" 
                      className="w-4 h-4 text-red-600 focus:ring-red-600"
                      checked={selectedSize?.id === priceOption.id}
                      onChange={() => setSelectedSize(priceOption)}
                    />
                    <span className="font-black text-sm uppercase text-gray-700">{priceOption.size}</span>
                  </div>
                  <span className="font-black text-green-600">R$ {Number(priceOption.price).toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* MEIO A MEIO (SÓ PARA PIZZAS) */}
          {isPizza && (
            <div className="space-y-3 animate-in fade-in">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Como você quer?</h3>
              <div className="flex gap-2">
                <button 
                  className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${pizzaType === 'inteira' ? 'border-red-600 bg-red-600 text-white shadow-lg' : 'border-gray-100 text-gray-400'}`}
                  onClick={() => { setPizzaType('inteira'); setSecondFlavorId(''); }}
                >
                  Inteira (1 Sabor)
                </button>
                <button 
                  className={`flex-1 py-3 rounded-xl border-2 font-black uppercase text-[10px] tracking-widest transition-all ${pizzaType === 'meio-a-meio' ? 'border-red-600 bg-red-600 text-white shadow-lg' : 'border-gray-100 text-gray-400'}`}
                  onClick={() => setPizzaType('meio-a-meio')}
                >
                  Meio a Meio
                </button>
              </div>

              {/* LISTA DE SABORES PARA A SEGUNDA METADE */}
              {pizzaType === 'meio-a-meio' && (
                <div className="space-y-2 pt-2 animate-in slide-in-from-top-2">
                  <h3 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Escolha a 2ª Metade:</h3>
                  {otherFlavors.map(flavor => (
                    <label key={flavor.id} className="flex items-center p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer hover:bg-gray-100">
                      <input 
                        type="radio" 
                        name="secondFlavor" 
                        className="w-4 h-4 text-red-600"
                        checked={secondFlavorId === flavor.id}
                        onChange={() => setSecondFlavorId(flavor.id)}
                      />
                      <span className="ml-3 font-bold text-xs text-gray-700 uppercase">{flavor.name}</span>
                    </label>
                  ))}
                  <p className="text-[9px] text-gray-400 uppercase italic text-center mt-2">* Será cobrado o valor da pizza mais cara.</p>
                </div>
              )}
            </div>
          )}

          {/* OBSERVAÇÕES */}
          <div className="space-y-2 pb-6">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações</h3>
            <textarea 
              className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none focus:border-red-500 transition text-sm font-bold placeholder:font-medium"
              rows={2}
              placeholder="Ex: Tirar a cebola, enviar sachês..."
              value={observation}
              onChange={e => setObservation(e.target.value)}
            />
          </div>
        </div>

        {/* FOOTER DE AÇÃO */}
        <div className="p-6 border-t bg-white">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl overflow-hidden">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 text-red-600 font-black hover:bg-gray-100">-</button>
              <span className="px-2 text-sm font-black text-gray-800">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-3 text-green-600 font-black hover:bg-gray-100">+</button>
            </div>
            
            <button 
              onClick={handleAdd}
              className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition active:scale-95 flex justify-between items-center px-6"
            >
              <span>Adicionar</span>
              <span>R$ {total.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}