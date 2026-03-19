// app/admin/categorias/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Category {
  id: string
  name: string
  sort_order: number
  _count: { products: number }
}


export default function AdminCategoriasPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => { if (r.status === 401) router.push('/admin'); return r.json() })
      .then(setCategories)
      .finally(() => setIsLoading(false))
  }, [router])

  // ── Criar ──
  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => [...prev, data])
      setNewName('')
      showToast('Categoria criada!')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setIsCreating(false)
    }
  }

  // ── Renomear ──
  const handleRename = async (id: string) => {
    if (!editingName.trim()) return
    try {
      const res = await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: editingName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name: data.name } : c))
      setEditingId(null)
      showToast('Categoria renomeada!')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  // ── Excluir ──
  const handleDelete = async (cat: Category) => {
    if (cat._count.products > 0) {
      showToast(`Mova os ${cat._count.products} produto(s) antes de excluir.`, 'error')
      return
    }
    if (!confirm(`Excluir "${cat.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/categories?id=${cat.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      showToast('Categoria excluída!')
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }

  // ── Drag & Drop reorder ──
  const handleDragStart = (index: number) => { dragItem.current = index }
  const handleDragEnter = (index: number) => { dragOver.current = index }

  const handleDragEnd = async () => {
    if (dragItem.current === null || dragOver.current === null) return
    if (dragItem.current === dragOver.current) return

    const reordered = [...categories]
    const dragged = reordered.splice(dragItem.current, 1)[0]
    reordered.splice(dragOver.current, 0, dragged)

    const withOrder = reordered.map((c, i) => ({ ...c, sort_order: i + 1 }))
    setCategories(withOrder)
    dragItem.current = null
    dragOver.current = null

    try {
      await fetch('/api/admin/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withOrder.map(c => ({ id: c.id, sort_order: c.sort_order }))),
      })
    } catch {
      showToast('Erro ao salvar ordem.', 'error')
    }
  }

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
            <h1 className="font-black text-gray-900 text-sm uppercase tracking-tight">Categorias</h1>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
              {categories.length}
            </span>
          </div>
          <Link href="/admin/produtos" className="text-xs font-bold text-blue-600 hover:underline">
            Ver Produtos →
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* ── Criar categoria ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight mb-3">Nova Categoria</h2>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ex: Pizzas Especiais"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 bg-gray-50"
            />
            <button
              onClick={handleCreate}
              disabled={isCreating || !newName.trim()}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white px-5 py-3 rounded-xl font-black text-sm transition active:scale-[0.98] shrink-0"
            >
              {isCreating ? '...' : 'Criar'}
            </button>
          </div>
        </div>

        {/* ── Lista de categorias ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Categorias</h2>
            <p className="text-[10px] text-gray-400 font-medium">Arraste para reordenar</p>
          </div>

          {categories.length === 0 ? (
            <div className="py-16 flex flex-col items-center text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm font-bold text-gray-400">Nenhuma categoria ainda</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {categories.map((cat, index) => (
                <li
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-grab active:cursor-grabbing group"
                >
                  {/* Handle */}
                  <div className="text-gray-300 group-hover:text-gray-400 shrink-0">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M7 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 2zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 7 14zm6-8a2 2 0 1 0-.001-4.001A2 2 0 0 0 13 6zm0 2a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 8zm0 6a2 2 0 1 0 .001 4.001A2 2 0 0 0 13 14z" />
                    </svg>
                  </div>

                  {/* Nome ou input de edição */}
                  <div className="flex-1 min-w-0">
                    {editingId === cat.id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleRename(cat.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onBlur={() => handleRename(cat.id)}
                        className="w-full px-3 py-1.5 border border-red-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 truncate">{cat.name}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full font-bold shrink-0">
                          {cat._count.products} produto{cat._count.products !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  {editingId !== cat.id && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditingId(cat.id); setEditingName(cat.name) }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                        title="Renomear"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                        title="Excluir"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          Categorias com produtos não podem ser excluídas diretamente.
        </p>
      </div>
    </div>
  )
}