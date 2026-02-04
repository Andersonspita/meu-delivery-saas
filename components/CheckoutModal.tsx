'use client'

import { useState, useEffect } from 'react'
import { DeliveryZone } from '@/types/database'

export interface CheckoutData {
  customerName: string
  customerPhone: string
  deliveryZone: DeliveryZone | null
  address: string
  paymentMethod: string
  changeFor?: string
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  deliveryZones: DeliveryZone[]
  cartTotal: number
  cartItems: any[] // <--- NOVO: Recebe a lista de itens
  onConfirm: (data: CheckoutData) => void
  onRemoveItem: (index: number) => void // <--- NOVO: Função para deletar item
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  deliveryZones, 
  cartTotal, 
  cartItems, 
  onConfirm,
  onRemoveItem
}: CheckoutModalProps) {
  const [step, setStep] = useState<'cart' | 'form'>('cart') // Controle de passos
  
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [changeFor, setChangeFor] = useState('')

  // Sempre que abrir, começa na sacola
  useEffect(() => {
    if (isOpen) setStep('cart')
  }, [isOpen])

  if (!isOpen) return null

  const selectedZone = deliveryZones.find(z => z.id === selectedZoneId) || null
  const deliveryPrice = selectedZone ? Number(selectedZone.price) : 0
  const finalTotal = cartTotal + deliveryPrice

  const handleConfirm = () => {
    if (!customerName || !customerPhone || !selectedZoneId || !address) {
      alert('Por favor, preencha todos os campos obrigatórios.')
      return
    }

    onConfirm({
      customerName,
      customerPhone,
      deliveryZone: selectedZone,
      address,
      paymentMethod,
      changeFor
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full sm:max-w-md h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-300">
        
        {/* CABEÇALHO */}
        <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-bold text-lg text-gray-800">
            {step === 'cart' ? '🛒 Sua Sacola' : '📝 Finalizar Pedido'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* CONTEÚDO COM SCROLL */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          
          {/* PASSO 1: LISTA DE ITENS (A SACOLA) */}
          {step === 'cart' && (
            <div className="space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-10">
                    <span className="text-4xl block mb-2">🛍️</span>
                    <p className="text-gray-500">Sua sacola está vazia.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {cartItems.map((item, index) => (
                    <li key={index} className="py-4 flex gap-4">
                      {/* FOTO DO ITEM */}
                      <div className="w-16 h-16 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center overflow-hidden border">
                         {item.image_url ? (
                            <img src={item.image_url} className="w-full h-full object-cover" />
                         ) : (
                            <span className="text-xl">🍕</span>
                         )}
                      </div>

                      {/* DETALHES */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-800 text-sm truncate pr-2">{item.name}</h4>
                          <span className="font-bold text-gray-900 text-sm whitespace-nowrap">R$ {item.price.toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-gray-500">{item.size}</p>
                        
                        {/* Sabores Extras */}
                        {item.flavors && item.flavors.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-1 rounded inline-block">
                            + {item.flavors.join(' e ')}
                          </p>
                        )}

                        {/* Observação */}
                        {item.observation && (
                          <p className="text-xs text-red-500 italic mt-1 line-clamp-1">
                            Obs: {item.observation}
                          </p>
                        )}
                      </div>

                      {/* BOTÃO REMOVER */}
                      <button 
                        onClick={() => onRemoveItem(index)}
                        className="text-gray-400 hover:text-red-500 self-start p-1 transition-colors"
                        title="Remover item"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* PASSO 2: FORMULÁRIO DE ENTREGA */}
          {step === 'form' && (
            <div className="space-y-4 animate-in slide-in-from-right-10 duration-300">
              
              {/* Seus Dados */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                    👤 Seus Dados
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Seu Nome"
                    className="w-full p-3 border rounded text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                  <input
                    type="tel"
                    placeholder="Seu WhatsApp (com DDD)"
                    className="w-full p-3 border rounded text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Endereço */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                    📍 Entrega
                </h3>
                <div className="space-y-3">
                  <select
                    className="w-full p-3 border rounded text-sm bg-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                    value={selectedZoneId}
                    onChange={e => setSelectedZoneId(e.target.value)}
                  >
                    <option value="">Selecione seu Bairro...</option>
                    {deliveryZones.map(zone => (
                      <option key={zone.id} value={zone.id}>
                        {zone.neighborhood_name} (+ R$ {Number(zone.price).toFixed(2)})
                      </option>
                    ))}
                  </select>
                  
                  {selectedZoneId && (
                    <textarea
                      placeholder="Nome da Rua, Número e Referência"
                      className="w-full p-3 border rounded text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                      rows={2}
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                    />
                  )}
                </div>
              </div>

              {/* Pagamento */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <h3 className="font-bold text-gray-700 text-sm mb-3 uppercase tracking-wide flex items-center gap-2">
                    💰 Pagamento
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 border rounded bg-white cursor-pointer hover:border-red-300 transition">
                    <input type="radio" name="payment" value="pix" checked={paymentMethod === 'pix'} onChange={() => setPaymentMethod('pix')} className="text-red-600 focus:ring-red-500" />
                    <span className="text-sm font-medium">PIX</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded bg-white cursor-pointer hover:border-red-300 transition">
                    <input type="radio" name="payment" value="cartao" checked={paymentMethod === 'cartao'} onChange={() => setPaymentMethod('cartao')} className="text-red-600 focus:ring-red-500" />
                    <span className="text-sm font-medium">Cartão (Maquininha)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border rounded bg-white cursor-pointer hover:border-red-300 transition">
                    <input type="radio" name="payment" value="dinheiro" checked={paymentMethod === 'dinheiro'} onChange={() => setPaymentMethod('dinheiro')} className="text-red-600 focus:ring-red-500" />
                    <span className="text-sm font-medium">Dinheiro</span>
                  </label>

                  {paymentMethod === 'dinheiro' && (
                    <div className="ml-7 mt-2 animate-in fade-in">
                        <label className="text-xs text-gray-500 block mb-1">Precisa de troco para quanto?</label>
                        <input
                            type="text"
                            placeholder="Ex: 50,00"
                            className="w-full p-2 border rounded text-sm"
                            value={changeFor}
                            onChange={e => setChangeFor(e.target.value)}
                        />
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* RODAPÉ DO MODAL (TOTAL E BOTÃO) */}
        <div className="border-t p-4 bg-white sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {/* Resumo de Valores */}
            <div className="flex justify-between items-center mb-2 text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-bold text-gray-800">R$ {cartTotal.toFixed(2)}</span>
            </div>
            {step === 'form' && selectedZone && (
                <div className="flex justify-between items-center mb-2 text-sm animate-in fade-in">
                    <span className="text-gray-500">Taxa de Entrega</span>
                    <span className="font-bold text-red-600">+ R$ {deliveryPrice.toFixed(2)}</span>
                </div>
            )}
            
            <div className="flex justify-between items-center mb-6 text-xl font-bold border-t pt-3 border-dashed border-gray-200">
                <span className="text-gray-900">Total</span>
                <span className="text-green-600">R$ {finalTotal.toFixed(2)}</span>
            </div>

            {/* Botões de Ação */}
            {step === 'cart' ? (
                 <button 
                 onClick={() => setStep('form')}
                 disabled={cartItems.length === 0}
                 className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-200 flex justify-center items-center gap-2"
               >
                 Continuar para Entrega <span>→</span>
               </button>
            ) : (
                <div className="flex gap-3">
                    <button 
                        onClick={() => setStep('cart')}
                        className="px-5 py-4 border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                        ← Voltar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        className="flex-1 bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 transition shadow-lg shadow-green-200 flex justify-center items-center gap-2"
                    >
                        <span>Enviar Pedido</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
                    </button>
                </div>
            )}
        </div>

      </div>
    </div>
  )
}