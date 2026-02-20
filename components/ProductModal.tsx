'use client'

import { useState, useEffect } from 'react'
import { Product } from '@/types/database'

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  allProducts: Product[]
  onAddToCart: (item: any) => void
}

export default function ProductModal({ isOpen, onClose, product, allProducts, onAddToCart }: ProductModalProps) {
  const [selectedSizeName, setSelectedSizeName] = useState<string>('')
  const [observation, setObservation] = useState('')
  
  const [extraFlavor1, setExtraFlavor1] = useState<string>('')
  const [extraFlavor2, setExtraFlavor2] = useState<string>('')

  useEffect(() => {
    if (isOpen && product) {
      const prices = product.product_prices?.sort((a, b) => a.price - b.price) || []
      if (prices.length > 0) setSelectedSizeName(prices[0].size_name)
      setObservation('')
      setExtraFlavor1('')
      setExtraFlavor2('')
    }
  }, [isOpen, product])

  if (!isOpen || !product) return null

  const basePriceObj = product.product_prices?.find(p => p.size_name === selectedSizeName)
  const basePrice = basePriceObj ? basePriceObj.price : 0

  const availableFlavors = allProducts.filter(p => 
    p.category_id === product.category_id && 
    p.id !== product.id && 
    p.product_prices?.some(price => price.size_name === selectedSizeName)
  )

  const getPriceForProductBySize = (prodId: string, sizeName: string) => {
    const prod = allProducts.find(p => p.id === prodId)
    const priceObj = prod?.product_prices?.find(pr => pr.size_name === sizeName)
    return priceObj ? priceObj.price : 0
  }

  const price1 = extraFlavor1 ? getPriceForProductBySize(extraFlavor1, selectedSizeName) : 0
  const price2 = extraFlavor2 ? getPriceForProductBySize(extraFlavor2, selectedSizeName) : 0
  
  const finalPrice = Math.max(basePrice, price1, price2)

  const handleConfirm = () => {
    const extraNames = []
    if (extraFlavor1) {
      const p1 = allProducts.find(p => p.id === extraFlavor1)
      if (p1) extraNames.push(p1.name)
    }
    if (extraFlavor2) {
      const p2 = allProducts.find(p => p.id === extraFlavor2)
      if (p2) extraNames.push(p2.name)
    }

    // AJUSTE SÊNIOR: Alterado de product_id para productId para bater com a Server Action
    onAddToCart({
      productId: product.id, 
      name: product.name,
      size: selectedSizeName,
      price: finalPrice,
      observation,
      flavors: extraNames,
      image_url: product.image_url 
    })
    onClose()
  }

  const canSplit = availableFlavors.length > 0 && product.allows_half_half

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col relative overflow-hidden">
        
        <button 
            onClick={onClose} 
            className="absolute top-3 right-3 bg-black/30 text-white rounded-full p-2 hover:bg-black/50 z-20 backdrop-blur-md transition"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>

        <div className="h-56 bg-gray-100 flex items-center justify-center relative shrink-0">
             {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
             ) : (
                <div className="flex flex-col items-center justify-center text-gray-300">
                    <span className="text-6xl mb-2">🍕</span>
                    <span className="text-sm font-medium">Sem foto</span>
                </div>
             )}
             <div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-black/60 to-transparent"></div>
             <h2 className="absolute bottom-4 left-4 text-2xl font-bold text-white shadow-black drop-shadow-md">{product.name}</h2>
        </div>

        <div className="p-6 space-y-8">
          <p className="text-gray-600 text-sm leading-relaxed">{product.description}</p>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">1. Escolha o Tamanho</label>
            <div className="grid grid-cols-1 gap-3">
              {product.product_prices?.sort((a, b) => a.price - b.price).map((price) => (
                <div 
                  key={price.size_name}
                  onClick={() => setSelectedSizeName(price.size_name)}
                  className={`flex justify-between items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedSizeName === price.size_name 
                      ? 'border-red-500 bg-red-50 ring-0' 
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`font-medium ${selectedSizeName === price.size_name ? 'text-red-700' : 'text-gray-700'}`}>{price.size_name}</span>
                  <span className={`font-bold ${selectedSizeName === price.size_name ? 'text-red-700' : 'text-gray-900'}`}>R$ {price.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {canSplit && selectedSizeName && (
            <div className="bg-gray-50 p-5 rounded-xl border border-dashed border-gray-300">
              <label className="text-sm font-bold text-gray-800 flex items-center gap-2 mb-4">
                Montar Pizza (Até 3 Sabores)
              </label>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">2º Sabor</label>
                  <select 
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
                    value={extraFlavor1}
                    onChange={(e) => setExtraFlavor1(e.target.value)}
                  >
                    <option value="">-- Apenas {product.name} --</option>
                    {availableFlavors.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {extraFlavor1 && (
                  <div className="animate-in fade-in slide-in-from-top-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1.5">3º Sabor</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-500 outline-none"
                      value={extraFlavor2}
                      onChange={(e) => setExtraFlavor2(e.target.value)}
                    >
                      <option value="">-- Não adicionar --</option>
                      {availableFlavors
                        .filter(p => p.id !== extraFlavor1)
                        .map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 text-center">* O preço será cobrado pelo sabor de maior valor.</p>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 block">Observações</label>
            <textarea
              className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none transition bg-gray-50 focus:bg-white"
              rows={3}
              placeholder="Ex: Tirar a cebola, massa bem assada..."
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
            />
          </div>
        </div>

        <div className="p-4 border-t bg-white mt-auto sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4 px-2">
             <span className="text-gray-500 text-sm font-medium">Total do Item</span>
             <span className="text-2xl font-bold text-gray-900">R$ {finalPrice.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleConfirm}
            className="w-full py-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition transform active:scale-95 text-lg"
          >
            Adicionar à Sacola
          </button>
        </div>

      </div>
    </div>
  )
}