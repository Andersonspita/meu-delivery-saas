'use client'

import { useState, useEffect } from 'react'
import { CartItem } from '@/hooks/useCart'
import { DeliveryZone } from '@/types/database'

export interface CheckoutData {
  customerName: string
  customerPhone: string
  deliveryAddress: string
  paymentMethod: 'dinheiro' | 'cartao' | 'pix'
  changeFor?: string | null
  totalAmount: number
  deliveryPrice: number
}

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  cartItems: CartItem[]
  deliveryZones: DeliveryZone[]
  onRemoveItem: (id: string) => void
  onUpdateQuantity: (id: string, delta: number) => void
  onConfirm: (data: CheckoutData) => void
  isSubmitting: boolean
}

export default function CheckoutModal({ 
  isOpen, 
  onClose, 
  cartItems, 
  deliveryZones, 
  onRemoveItem, 
  onUpdateQuantity, 
  onConfirm, 
  isSubmitting 
}: CheckoutModalProps) {
  
  // Controle de Navegação: 'cart' (Sacola) -> 'delivery' (Dados)
  const [step, setStep] = useState<'cart' | 'delivery'>('cart')
  
  // Estados do Formulário (Sempre strings vazias, nunca undefined)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'cartao' | 'pix'>('pix')
  const [changeFor, setChangeFor] = useState('')

  // Resetar o modal ao abrir
  useEffect(() => {
    if (isOpen) {
        setStep('cart')
    }
  }, [isOpen])

  if (!isOpen) return null

  // Lógica de Preços
  const selectedZone = deliveryZones?.find(z => z.id === selectedZoneId)
  const deliveryPrice = selectedZone ? Number(selectedZone.price) : 0
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0)
  const totalAmount = subtotal + deliveryPrice

  const handleProcessOrder = () => {
    if (!customerName || !customerPhone || !selectedZoneId || !address) {
      return alert('⚠️ Preencha todos os campos para a entrega!')
    }
    
    onConfirm({
      customerName,
      customerPhone,
      deliveryAddress: `${address} - Bairro: ${selectedZone?.neighborhood_name}`,
      paymentMethod,
      changeFor: paymentMethod === 'dinheiro' ? (changeFor || 'Não solicitado') : null,
      totalAmount: totalAmount,
      deliveryPrice: deliveryPrice
    })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4 font-sans">
      <div className="bg-white w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-gray-100">
        
        {/* HEADER FIXO */}
        <div className="p-6 border-b flex justify-between items-center bg-white">
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight italic">
            {step === 'cart' ? '🛒 Minha Sacola' : '📍 Checkout Final'}
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* CONTEÚDO DINÂMICO */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {step === 'cart' ? (
            /* PASSO 1: REVISÃO DA SACOLA */
            <div className="space-y-4">
              {cartItems.length === 0 ? (
                <div className="text-center py-12 opacity-40 font-black uppercase text-xs">Sua sacola está vazia</div>
              ) : (
                cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-3xl border border-gray-100 animate-in fade-in zoom-in-95">
                    <div className="flex-1">
                      <p className="font-black text-gray-800 text-sm leading-none uppercase">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">{item.size}</p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center bg-white border-2 border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                          <button onClick={() => onUpdateQuantity(item.id, -1)} className="px-3 py-1 text-red-600 font-black hover:bg-red-50">-</button>
                          <span className="px-2 text-xs font-black text-gray-700 min-w-[20px] text-center">{item.quantity}</span>
                          <button onClick={() => onUpdateQuantity(item.id, 1)} className="px-3 py-1 text-green-600 font-black hover:bg-green-50">+</button>
                        </div>
                        <button onClick={() => onRemoveItem(item.id)} className="text-[9px] text-gray-300 font-black uppercase hover:text-red-500 transition">Excluir</button>
                      </div>
                    </div>
                    <p className="font-black text-gray-900">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* PASSO 2: DADOS DE ENTREGA */
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Nome Completo</label>
                 <input 
                   type="text" 
                   className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none focus:border-red-500 font-bold text-sm" 
                   value={customerName} 
                   onChange={e => setCustomerName(e.target.value)} 
                   placeholder="Quem recebe o pedido?" 
                 />
               </div>
               
               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">WhatsApp</label>
                 <input 
                   type="tel" 
                   className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none focus:border-red-500 font-bold text-sm" 
                   value={customerPhone} 
                   onChange={e => setCustomerPhone(e.target.value)} 
                   placeholder="(00) 00000-0000" 
                 />
               </div>

               <div className="space-y-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Selecione seu Bairro</label>
                 <div className="relative">
                    <select 
                        required
                        className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none focus:border-red-500 font-bold text-sm appearance-none" 
                        value={selectedZoneId} 
                        onChange={e => setSelectedZoneId(e.target.value)}
                    >
                        <option value="">Clique aqui para escolher seu bairro...</option>
                        {deliveryZones?.length > 0 ? (
                            deliveryZones.map(zone => (
                                <option key={zone.id} value={zone.id}>
                                    {zone.neighborhood_name} (+ R$ {Number(zone.price).toFixed(2)})
                                </option>
                            ))
                        ) : (
                            <option disabled>Bairros não carregados no sistema</option>
                        )}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">▼</div>
                 </div>
                 {deliveryZones?.length === 0 && (
                     <p className="text-[9px] text-red-500 font-bold italic uppercase mt-1 pl-1">⚠️ Erro: Nenhuma taxa de entrega cadastrada no banco.</p>
                 )}
               </div>

               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Endereço (Rua, Nº, Bloco)</label>
                  <textarea 
                      className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none focus:border-red-500 font-bold text-sm" 
                      rows={2} 
                      value={address} 
                      onChange={e => setAddress(e.target.value)} 
                      placeholder="Ex: Rua das Pizzas, 500 - Bloco A" 
                  />
               </div>

               <div className="pt-2">
                 <label className="text-[10px] font-black text-gray-400 uppercase block mb-3 text-center tracking-widest">Forma de Pagamento</label>
                 <div className="grid grid-cols-3 gap-2">
                    {['pix', 'cartao', 'dinheiro'].map(method => (
                      <button 
                        key={method} 
                        type="button"
                        onClick={() => setPaymentMethod(method as any)} 
                        className={`py-3 rounded-2xl border-2 font-black uppercase text-[10px] transition-all ${
                            paymentMethod === method ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105' : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                 </div>
               </div>

               {paymentMethod === 'dinheiro' && (
                 <div className="animate-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-widest">Troco para quanto?</label>
                    <input 
                        type="text" 
                        className="w-full p-4 border-2 border-gray-100 rounded-2xl bg-gray-50 outline-none focus:border-red-500 font-bold text-sm" 
                        value={changeFor} 
                        onChange={e => setChangeFor(e.target.value)} 
                        placeholder="Ex: 50,00 ou 100,00" 
                    />
                 </div>
               )}
            </div>
          )}
        </div>

        {/* FOOTER FIXO */}
        <div className="p-8 border-t bg-gray-50 space-y-4">
          <div className="space-y-1">
             <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
             </div>
             <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                <span>Taxa de Entrega</span>
                <span className="text-green-600">{deliveryPrice > 0 ? `+ R$ ${deliveryPrice.toFixed(2)}` : 'Selecione o bairro'}</span>
             </div>
             <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-black text-gray-800 uppercase italic">Valor Total</span>
                <span className="text-3xl font-black text-red-600 tracking-tighter">R$ {totalAmount.toFixed(2)}</span>
             </div>
          </div>

          <div className="flex gap-3 pt-2">
            {step === 'delivery' && (
                <button 
                    onClick={() => setStep('cart')}
                    className="px-6 py-4 border-2 border-gray-200 rounded-2xl font-black uppercase text-[10px] text-gray-400 hover:bg-white transition"
                >
                    Voltar
                </button>
            )}
            <button 
                onClick={() => step === 'cart' ? setStep('delivery') : handleProcessOrder()}
                disabled={isSubmitting || (step === 'cart' && cartItems.length === 0)}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-red-100 hover:bg-red-700 transition active:scale-95 disabled:opacity-50"
            >
                {step === 'cart' ? 'Dados de Entrega' : isSubmitting ? 'Enviando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}