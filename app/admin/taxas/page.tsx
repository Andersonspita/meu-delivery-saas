// app/admin/taxas/page.tsx
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

export default function AdminTaxasPage() {
  const router = useRouter()
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Form nova zona
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Edição inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    fetch('/api/admin/delivery')
      .then(r => { if (r.status === 401) { router.push('/admin'); return r } return r })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setZones(data) })
      .finally(() => setIsLoading(false))
  }, [router])

  // ── Criar zona ──
  const handleCreate = async () => {
    if (!newName.trim()) return showToast('Nome do bairro obrigatório.', 'error')
    setIsCreating(true)
    try {
      const res = await fetch('/api/admin/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neighborhood_name: newName.trim(),
          price: parseFloat(newPrice) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setZones(prev => [...prev, data].sort((a, b) => a.price - b.price))
      setNewName('')
      setNewPrice('')
      showToast('Bairro adicionado!')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Edição inline ──
  const startEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id)
    setEditName(zone.neighborhood_name)
    setEditPrice(zone.price.toString())
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditPrice('')
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return showToast('Nome obrigatório.', 'error')
    setIsSavingEdit(true)
    try {
      const res = await fetch('/api/admin/delivery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          neighborhood_name: editName.trim(),
          price: parseFloat(editPrice) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setZones(prev =>
        prev.map(z => z.id === id ? data : z).sort((a, b) => a.price - b.price)
      )
      setEditingId(null)
      showToast('Bairro atualizado!')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // ── Toggle ativo/inativo ──
  const handleToggle = async (zone: DeliveryZone) => {
    const newVal = !zone.active
    setZones(prev => prev.map(z => z.id === zone.id ? { ...z, active: newVal } : z))
    try {
      const res = await fetch('/api/admin/delivery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: zone.id, active: newVal }),
      })
      if (!res.ok) throw new Error()
      showToast(newVal ? 'Bairro ativado!' : 'Bairro desativado!')
    } catch {
      setZones(prev => prev.map(z => z.id === zone.id ? { ...z, active: !newVal } : z))
      showToast('Erro ao atualizar.', 'error')
    }
  }

  // ── Excluir ──
  const handleDelete = async (zone: DeliveryZone) => {
    if (!confirm(`Excluir "${zone.neighborhood_name}"?`)) return
    try {
      const res = await fetch(`/api/admin/delivery?id=${zone.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setZones(prev => prev.filter(z => z.id !== zone.id))
      showToast('Bairro removido!')
    } catch {
      showToast('Erro ao excluir.', 'error')
    }
  }

  const activeCount = zones.filter(z => z.active).length
  const inactiveCount = zones.filter(z => !z.active).length

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-xl text-sm font-bold text-white flex items-center gap-2 animate-in slide-in-from-top-3 ${
          toast.type === 'success' ? 'bg-gray-900' : 'bg-red-600'
        }`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-black text-gray-900 text-sm uppercase tracking-tight">Taxas de Entrega</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-green-100 text-green-700 font-bold px-2 py-1 rounded-full">
              {activeCount} ativo{activeCount !== 1 ? 's' : ''}
            </span>
            {inactiveCount > 0 && (
              <span className="bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded-full">
                {inactiveCount} inativo{inactiveCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Adicionar novo bairro ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight mb-4">
            Adicionar Bairro
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome do bairro"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition"
            />
            <div className="relative w-32 shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="0,00"
                value={newPrice}
                onChange={e => setNewPrice(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full pl-8 pr-3 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-4 py-3 rounded-xl font-black text-sm transition active:scale-[0.98] shrink-0"
            >
              {isCreating ? '...' : 'Adicionar'}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            Taxa R$ 0,00 = entrega grátis. Pressione Enter para confirmar.
          </p>
        </div>

        {/* ── Lista de bairros ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">
              Bairros Cadastrados
            </h2>
          </div>

          {zones.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">🛵</div>
              <p className="text-sm font-bold text-gray-400">Nenhum bairro cadastrado</p>
              <p className="text-xs text-gray-300 mt-1">Adicione os bairros que você entrega acima</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {zones.map(zone => (
                <li key={zone.id} className={`px-4 py-3 transition ${!zone.active ? 'opacity-50' : ''}`}>
                  {editingId === zone.id ? (
                    // ── MODO EDIÇÃO ──
                    <div className="flex gap-2 items-center">
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(zone.id); if (e.key === 'Escape') cancelEdit() }}
                        className="flex-1 px-3 py-2 border border-red-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 bg-gray-50"
                      />
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.50"
                          value={editPrice}
                          onChange={e => setEditPrice(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEdit(zone.id); if (e.key === 'Escape') cancelEdit() }}
                          className="w-full pl-8 pr-3 py-2 border border-red-400 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 bg-gray-50"
                        />
                      </div>
                      <button
                        onClick={() => saveEdit(zone.id)}
                        disabled={isSavingEdit}
                        className="w-8 h-8 bg-green-500 hover:bg-green-600 rounded-xl flex items-center justify-center transition shrink-0"
                      >
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition shrink-0"
                      >
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    // ── MODO VISUALIZAÇÃO ──
                    <div className="flex items-center gap-3">
                      {/* Toggle ativo */}
                      <button
                        onClick={() => handleToggle(zone)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${zone.active ? 'bg-green-500' : 'bg-gray-300'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${zone.active ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>

                      {/* Nome */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{zone.neighborhood_name}</p>
                        {!zone.active && (
                          <p className="text-[10px] text-gray-400 font-medium">Inativo — não aparece no cardápio</p>
                        )}
                      </div>

                      {/* Preço */}
                      <span className={`text-sm font-black shrink-0 ${zone.price === 0 ? 'text-green-600' : 'text-gray-800'}`}>
                        {zone.price === 0 ? 'Grátis' : `R$ ${zone.price.toFixed(2)}`}
                      </span>

                      {/* Ações */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(zone)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(zone)}
                          className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resumo */}
        {zones.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-xs text-blue-700 font-medium space-y-1">
            <p className="font-black uppercase tracking-wider text-blue-800 mb-2">Como funciona</p>
            <p>• Bairros <strong>ativos</strong> aparecem para o cliente escolher no checkout.</p>
            <p>• Bairros <strong>inativos</strong> ficam salvos mas não aparecem no cardápio.</p>
            <p>• Taxa <strong>R$ 0,00</strong> aparece como &quot;Grátis&quot; para o cliente.</p>
            <p>• Clique no toggle para ativar/desativar sem excluir.</p>
          </div>
        )}
      </div>
    </div>
  )
}