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

function getMaxFlavors(sizeName: string): number {
  const s = (sizeName || '').toLowerCase()
  if (s.includes('broto')) return 1
  if (s.includes('média') || s.includes('media') || s.includes('medio') || s.includes('médio')) return 2
  if (s.includes('grande')) return 3
  return 1
}

export default function ProductModal({ isOpen, onClose, product, allProducts, onAddToCart }: ProductModalProps) {
  const [selectedSize, setSelectedSize] = useState<any>(null)
  const [selectedFlavors, setSelectedFlavors] = useState<Product[]>([])
  const [observation, setObservation] = useState('')
  const [quantity, setQuantity] = useState(1)

  // Reset ao abrir com novo produto — inicia com maior tamanho para mostrar sabores
  useEffect(() => {
    if (product && isOpen) {
      const prices = [...(product.product_prices || [])].sort((a, b) => Number(a.price) - Number(b.price))
      // Inicia com o MAIOR tamanho para que sabores apareçam por padrão
      const biggestPrice = prices[prices.length - 1] || prices[0] || null
      setSelectedSize(biggestPrice)
      setSelectedFlavors([product])
      setObservation('')
      setQuantity(1)
    }
  }, [product, isOpen])

  if (!isOpen || !product) return null

  const allowsHalfHalf = product.allows_half_half
  const maxFlavors = selectedSize ? getMaxFlavors(selectedSize.size_name) : 1
  const sameCategoryProducts = allProducts.filter(p => p.category_id === product.category_id)

  const getPriceForSize = (p: Product, sizeName: string): number => {
    const priceObj = (p.product_prices || []).find(pp => pp.size_name === sizeName)
    return priceObj ? Number(priceObj.price) : 0
  }

  const selectedPrices = selectedFlavors.map(f => getPriceForSize(f, selectedSize?.size_name || ''))
  const avgPrice = selectedPrices.length > 0
    ? selectedPrices.reduce((a, b) => a + b, 0) / selectedPrices.length
    : 0
  const finalPrice = avgPrice

  // Muda tamanho e reseta sabores
  const handleSizeChange = (priceOption: any) => {
    setSelectedSize(priceOption)
    // Mantém só os sabores que têm preço para este tamanho
    setSelectedFlavors(prev =>
      prev.filter(f => getPriceForSize(f, priceOption.size_name) > 0).length > 0
        ? prev.filter(f => getPriceForSize(f, priceOption.size_name) > 0)
        : [product]
    )
  }

  // Toggle sabor
  const toggleFlavor = (p: Product) => {
    const isSelected = selectedFlavors.some(f => f.id === p.id)

    if (isSelected) {
      if (selectedFlavors.length === 1) return // não desmarca o único
      setSelectedFlavors(prev => prev.filter(f => f.id !== p.id))
    } else {
      if (selectedFlavors.length >= maxFlavors) {
        // Substitui o último que NÃO é o produto principal
        const lastNonMain = [...selectedFlavors].reverse().findIndex(f => f.id !== product.id)
        if (lastNonMain === -1) {
          // Todos são o principal — substitui o último
          setSelectedFlavors(prev => [...prev.slice(0, -1), p])
        } else {
          const realIdx = selectedFlavors.length - 1 - lastNonMain
          setSelectedFlavors(prev => prev.map((f, i) => i === realIdx ? p : f))
        }
        return
      }
      setSelectedFlavors(prev => [...prev, p])
    }
  }

  // Adicionar ao carrinho — UMA entrada com quantity, não loop
  const handleAdd = () => {
    if (!selectedSize) return alert('Selecione um tamanho.')

    const flavorNames = selectedFlavors.map(f => f.name)
    const itemName = selectedFlavors.length === 1
      ? product.name
      : selectedFlavors.map(f => {
          const fraction = selectedFlavors.length === 2 ? '1/2' : '1/3'
          return `${fraction} ${f.name}`
        }).join(' + ')

    // Uma única chamada com quantity — o MenuInterface/CartDrawer lida com quantidade
    onAddToCart({
      product_id: product.id,
      name: itemName,
      price: finalPrice,
      size: selectedSize.size_name,   // ← sempre usa size_name do selectedSize atual
      flavors: selectedFlavors.length > 1 ? flavorNames : [],
      observation: observation.trim(),
      quantity,
    })
  }

  const sortedPrices = [...(product.product_prices || [])].sort((a, b) => Number(a.price) - Number(b.price))

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4 font-sans">
      <div className="bg-white w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">

        {/* IMAGEM */}
        <div className="relative h-44 bg-gray-100 shrink-0">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🍕</div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-gray-700 shadow-lg font-bold text-sm hover:bg-white transition"
          >
            ✕
          </button>
        </div>

        {/* CONTEÚDO SCROLLÁVEL */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Nome */}
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight leading-tight">{product.name}</h2>
              {product.description && (
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* TAMANHOS */}
            <div>
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                Escolha o Tamanho
              </h3>
              <div className="space-y-2">
                {sortedPrices.map(priceOption => (
                  <label
                    key={priceOption.id}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedSize?.id === priceOption.id
                        ? 'border-red-500 bg-red-50/60'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name={`size-${product.id}`}
                        className="w-4 h-4 accent-red-600"
                        checked={selectedSize?.id === priceOption.id}
                        onChange={() => handleSizeChange(priceOption)}
                      />
                      <div>
                        <p className="font-black text-sm text-gray-800">{priceOption.size_name}</p>
                        {allowsHalfHalf && getMaxFlavors(priceOption.size_name) > 1 && (
                          <p className="text-[10px] text-red-400 font-medium">
                            até {getMaxFlavors(priceOption.size_name)} sabores
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="font-black text-sm text-green-600">
                      R$ {Number(priceOption.price).toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* SABORES — aparece sempre que allows_half_half=true, independente do tamanho */}
            {allowsHalfHalf && sameCategoryProducts.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Sabores
                  </h3>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: maxFlavors }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-colors duration-200 ${
                          i < selectedFlavors.length ? 'bg-red-500' : 'bg-gray-200'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] text-gray-400 font-bold ml-1">
                      {selectedFlavors.length}/{maxFlavors}
                    </span>
                  </div>
                </div>

                {maxFlavors === 1 ? (
                  <p className="text-[10px] text-gray-400 mb-3">
                    Este tamanho comporta apenas 1 sabor. Escolha Média ou Grande para mais sabores.
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-400 mb-3">
                    Selecione até {maxFlavors} sabores. Preço = média entre os escolhidos.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {sameCategoryProducts.map(flavor => {
                    const isSelected = selectedFlavors.some(f => f.id === flavor.id)
                    const isMain = flavor.id === product.id
                    const flavorPrice = getPriceForSize(flavor, selectedSize?.size_name || '')
                    const isDisabled = maxFlavors === 1 && !isMain

                    return (
                      <button
                        key={flavor.id}
                        onClick={() => !isDisabled && toggleFlavor(flavor)}
                        disabled={isDisabled}
                        className={`relative flex flex-col items-start p-3 rounded-2xl border-2 text-left transition-all active:scale-[0.98] ${
                          isDisabled
                            ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed'
                            : isSelected
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-gray-100 mb-2 shrink-0">
                          {flavor.image_url ? (
                            <img src={flavor.image_url} alt={flavor.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg">🍕</div>
                          )}
                        </div>
                        <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2 pr-5">{flavor.name}</p>
                        {flavorPrice > 0 && (
                          <p className="text-[10px] text-green-600 font-bold mt-0.5">R$ {flavorPrice.toFixed(2)}</p>
                        )}
                        {isMain && (
                          <span className="text-[9px] text-red-500 font-bold mt-0.5">Principal</span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Resumo */}
                {selectedFlavors.length > 1 && (
                  <div className="mt-3 p-3 bg-orange-50 border border-orange-100 rounded-xl">
                    <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-1">Sua pizza:</p>
                    <p className="text-xs text-orange-800 font-medium leading-relaxed">
                      {selectedFlavors.map(f => {
                        const fraction = selectedFlavors.length === 2 ? '1/2' : '1/3'
                        return `${fraction} ${f.name}`
                      }).join(' + ')}
                    </p>
                    <p className="text-[10px] text-orange-500 mt-1.5 font-medium">
                      Preco: R$ {finalPrice.toFixed(2)} (media dos {selectedFlavors.length} sabores)
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* OBSERVAÇÕES */}
            <div className="pb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Observacoes</h3>
              <textarea
                className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none focus:border-red-400 transition text-sm placeholder:text-gray-300 resize-none"
                rows={2}
                placeholder="Ex: Tirar a cebola, sem borda..."
                value={observation}
                onChange={e => setObservation(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-50 border-2 border-gray-100 rounded-2xl overflow-hidden shrink-0">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="px-4 py-3 text-red-600 font-black text-lg hover:bg-gray-100 transition"
              >−</button>
              <span className="px-3 text-sm font-black text-gray-900 min-w-[2rem] text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="px-4 py-3 text-green-600 font-black text-lg hover:bg-gray-100 transition"
              >+</button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-red-100 transition active:scale-[0.98] flex items-center justify-between px-5"
            >
              <span>Adicionar {quantity > 1 ? `(${quantity}x)` : ''}</span>
              <span>R$ {(finalPrice * quantity).toFixed(2)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}