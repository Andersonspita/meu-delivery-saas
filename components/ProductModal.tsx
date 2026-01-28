// components/ProductModal.tsx
'use client'

import { useState } from 'react'
import { Product, ProductPrice } from '@/types/database'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onAddToCart: (item: any) => void
}

export default function ProductModal({ isOpen, onClose, product, onAddToCart }: ProductModalProps) {
  const [selectedPriceId, setSelectedPriceId] = useState<string>('')
  const [observation, setObservation] = useState('')

  if (!isOpen || !product) return null

  
  const prices = product.product_prices?.sort((a, b) => a.price - b.price) || []

  
  if (prices.length > 0 && !selectedPriceId) {
    setSelectedPriceId(prices[0].size_name || '') 
  }

  const handleConfirm = () => {
    
    const selectedPriceObj = prices.find(p => p.size_name === selectedPriceId) || prices[0]
    
    
    const finalPrice = selectedPriceObj ? selectedPriceObj.price : 0

    onAddToCart({
      product_id: product.id,
      name: product.name,
      size: selectedPriceObj?.size_name || 'Único',
      price: finalPrice,
      observation
    })
    
    
    setObservation('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Foto do Produto (Se tiver) */}
        <div className="h-32 bg-red-100 flex items-center justify-center">
             {/* Aqui iria a tag <img src={product.image_url} /> se tivesse foto real */}
             <span className="text-red-300 text-4xl">🍕</span>
        </div>

        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800">{product.name}</h2>
          <p className="text-gray-500 text-sm mt-1">{product.description}</p>

          {/* Seleção de Tamanhos */}
          {prices.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-semibold text-gray-700">Escolha o tamanho:</label>
              <div className="mt-2 space-y-2">
                {prices.map((price, idx) => (
                  <div 
                    key={idx}
                    onClick={() => setSelectedPriceId(price.size_name || '')}
                    className={`flex justify-between items-center p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedPriceId === price.size_name 
                        ? 'border-red-500 bg-red-50 ring-1 ring-red-500' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-gray-700">{price.size_name || 'Padrão'}</span>
                    <span className="font-bold text-gray-900">R$ {price.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Observação */}
          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-700">Observações:</label>
            <textarea
              className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500 outline-none text-black"
              rows={2}
              placeholder="Ex: Tirar a cebola, caprichar no orégano..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>

          {/* Botões de Ação */}
          <div className="mt-6 flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-1 py-3 px-4 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md"
            >
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}