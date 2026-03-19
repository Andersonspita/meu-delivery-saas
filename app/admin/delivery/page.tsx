'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface DeliveryZone {
  id: string
  neighborhood_name: string
  price: number
  active: boolean
}

export default function AdminDeliveryPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [zones, setZones] = useState<DeliveryZone[]>([])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null)
  
  const [formData, setFormData] = useState({
    neighborhood_name: '',
    price: '',
    active: true
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Verifica sessão na sua API interna
        const sessionRes = await fetch('/api/admin/session')
        if (!sessionRes.ok) return router.push('/admin')

        // Busca as zonas de entrega na sua API do Postgres
        const res = await fetch('/api/admin/delivery')
        const data = await res.json()
        setZones(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Erro ao carregar taxas:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [router])

  const openModal = (zone: DeliveryZone | null = null) => {
    if (zone) {
      setEditingZone(zone)
      setFormData({
        neighborhood_name: zone.neighborhood_name || '',
        price: zone.price?.toString() || '',
        active: zone.active ?? true
      })
    } else {
      setEditingZone(null)
      setFormData({ neighborhood_name: '', price: '', active: true })
    }
    setIsModalOpen(true)
  }

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const payload = {
        id: editingZone?.id, // Envia o ID apenas se estiver editando
        neighborhood_name: formData.neighborhood_name,
        price: parseFloat(formData.price) || 0,
        active: formData.active
      }

      // Usamos POST para criar e PATCH para editar na sua API
      const method = editingZone ? 'PATCH' : 'POST'
      
      const res = await fetch('/api/admin/delivery', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Erro ao salvar no servidor')

      alert('✅ Salvo com sucesso!')
      window.location.reload()
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este bairro?')) return
    try {
      const res = await fetch(`/api/admin/delivery?id=${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error()
      setZones(zones.filter(z => z.id !== id))
    } catch (err) {
      alert('Erro ao excluir.')
    }
  }

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-gray-400 uppercase">Carregando Taxas...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <nav className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-[10px] font-black uppercase text-gray-400 hover:text-black transition">← Painel</Link>
          <button onClick={() => openModal()} className="bg-red-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-100 transition hover:bg-red-700">+ Adicionar Bairro</button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-gray-50/50">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bairros e Taxas</h2>
          </div>
          <div className="divide-y">
            {zones.map((zone) => (
              <div key={zone.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition">
                <div>
                  <h3 className="font-black text-gray-800 uppercase text-lg">{zone.neighborhood_name}</h3>
                  <p className="text-green-600 font-black text-sm">R$ {Number(zone.price).toFixed(2)}</p>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => openModal(zone)} className="text-[10px] font-black text-blue-600 uppercase">Editar</button>
                  <button onClick={() => handleDelete(zone.id)} className="text-[10px] font-black text-red-400 uppercase">Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8">
            <h3 className="text-xl font-black text-gray-800 mb-6 uppercase italic">Configurar Bairro</h3>
            <form onSubmit={handleSaveZone} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nome do Bairro</label>
                <input 
                  type="text" 
                  required 
                  className="w-full p-3 border rounded-xl text-sm font-bold outline-none bg-gray-50"
                  value={formData.neighborhood_name} 
                  onChange={e => setFormData({...formData, neighborhood_name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Taxa de Entrega (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  className="w-full p-3 border rounded-xl text-sm font-bold outline-none bg-gray-50"
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 border-2 rounded-xl font-black text-[10px] uppercase text-gray-400">Voltar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase shadow-lg shadow-red-100">
                  {isSaving ? 'Gravando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}