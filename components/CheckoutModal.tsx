// components/CheckoutModal.tsx
'use client'

import { useState } from 'react'
import { DeliveryZone } from '@/types/database'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: CheckoutData) => void
  deliveryZones: DeliveryZone[]
  cartTotal: number
}

export interface CheckoutData {
  customerName: string
  customerPhone: string
  deliveryZone: DeliveryZone | null
  address: string
  paymentMethod: string
  changeFor: string 
}

export default function CheckoutModal({ isOpen, onClose, onConfirm, deliveryZones, cartTotal }: CheckoutModalProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedZoneId, setSelectedZoneId] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('pix')
  const [changeFor, setChangeFor] = useState('')

  if (!isOpen) return null

  const selectedZone = deliveryZones.find(z => z.id === selectedZoneId) || null
  const deliveryPrice = selectedZone ? selectedZone.price : 0
  const finalTotal = cartTotal + deliveryPrice

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onConfirm({
      customerName: name,
      customerPhone: phone,
      deliveryZone: selectedZone,
      address,
      paymentMethod,
      changeFor
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md h-[90vh] sm:h-auto sm:rounded-xl shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-bottom-10">
        
        {/* Cabeçalho do Modal */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
          <h2 className="font-bold text-lg text-gray-800">Finalizar Pedido</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-red-600 font-bold text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1">
          
          {/* Dados Pessoais */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Seu Nome</label>
            <input required type="text" placeholder="Como podemos te chamar?" className="w-full border p-2 rounded mt-1" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700">Seu Telefone (WhatsApp)</label>
            <input required type="tel" placeholder="(71) 99999-9999" className="w-full border p-2 rounded mt-1" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <hr className="border-gray-100 my-4" />

          {/* Entrega */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Bairro para Entrega</label>
            <select required className="w-full border p-2 rounded mt-1 bg-white" value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value)}>
              <option value="">Selecione seu bairro...</option>
              {deliveryZones.map(zone => (
                <option key={zone.id} value={zone.id}>
                  {zone.neighborhood_name} (+ R$ {zone.price.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {selectedZoneId && (
            <div>
              <label className="block text-sm font-semibold text-gray-700">Endereço Completo</label>
              <textarea required placeholder="Rua, Número e Ponto de Referência" className="w-full border p-2 rounded mt-1" rows={2} value={address} onChange={e => setAddress(e.target.value)} />
            </div>
          )}

          <hr className="border-gray-100 my-4" />

          {/* Pagamento */}
          <div>
            <label className="block text-sm font-semibold text-gray-700">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {['pix', 'cartao', 'dinheiro'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`p-2 rounded border text-sm capitalize ${
                    paymentMethod === method ? 'bg-green-50 border-green-500 text-green-700 font-bold' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                >
                  {method === 'cartao' ? 'Cartão' : method}
                </button>
              ))}
            </div>
          </div>

          {paymentMethod === 'dinheiro' && (
            <div className="animate-in fade-in">
              <label className="block text-sm font-semibold text-gray-700">Troco para quanto?</label>
              <input type="text" placeholder="Ex: 50,00 (Deixe vazio se não precisar)" className="w-full border p-2 rounded mt-1" value={changeFor} onChange={e => setChangeFor(e.target.value)} />
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="bg-gray-50 p-4 rounded-lg mt-6 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>R$ {cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Taxa de Entrega:</span>
              <span>+ R$ {deliveryPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-900 border-t pt-2 mt-2">
              <span>Total Final:</span>
              <span>R$ {finalTotal.toFixed(2)}</span>
            </div>
          </div>

          <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg mt-4">
            Enviar Pedido via WhatsApp 🚀
          </button>
        </form>
      </div>
    </div>
  )
}