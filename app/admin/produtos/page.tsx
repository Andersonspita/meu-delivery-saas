// app/admin/produtos/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Price { size_name: string; price: number }
interface Category { id: string; name: string }
interface Product {
  id: string
  name: string
  description: string | null
  image_url: string | null
  is_available: boolean
  allows_half_half: boolean
  category_id: string
  category: { id: string; name: string }
  product_prices: Price[]
}

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  image_url: '',
  category_id: '',
  is_available: true,
  allows_half_half: false,
  prices: [{ size_name: 'Único', price: 0 }] as Price[],
}

export default function AdminProdutosPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_PRODUCT)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Drag state
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  useEffect(() => {
    const load = async () => {
      const [productsRes, catsRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/categories'),
      ])
      if (productsRes.status === 401) { router.push('/admin'); return }
      setProducts(await productsRes.json())
      setCategories(await catsRes.json())
      setIsLoading(false)
    }
    load()
  }, [router])

  // ── Abrir modal ──
  const openCreate = () => {
    setEditingProduct(null)
    setForm({ ...EMPTY_PRODUCT, category_id: categories[0]?.id || '' })
    setIsModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditingProduct(p)
    setForm({
      name: p.name,
      description: p.description || '',
      image_url: p.image_url || '',
      category_id: p.category_id,
      is_available: p.is_available,
      allows_half_half: p.allows_half_half,
      prices: p.product_prices.length > 0
        ? p.product_prices.map(pp => ({ size_name: pp.size_name, price: pp.price }))
        : [{ size_name: 'Único', price: 0 }],
    })
    setIsModalOpen(true)
  }

  // ── Upload imagem ──
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', 'product')
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setForm(prev => ({ ...prev, image_url: data.url }))
      showToast('Imagem enviada!')
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setUploadingImage(false)
    }
  }

  // ── Salvar produto ──
  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Nome é obrigatório.', 'error')
    if (!form.category_id) return showToast('Selecione uma categoria.', 'error')
    if (form.prices.some(p => !p.size_name.trim())) return showToast('Preencha o nome dos tamanhos.', 'error')

    setIsSaving(true)
    try {
      const payload = {
        ...(editingProduct ? { id: editingProduct.id } : {}),
        name: form.name.trim(),
        description: form.description.trim() || null,
        image_url: form.image_url || null,
        category_id: form.category_id,
        is_available: form.is_available,
        allows_half_half: form.allows_half_half,
        prices: form.prices,
      }

      const res = await fetch('/api/admin/products', {
        method: editingProduct ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (editingProduct) {
        setProducts(prev => prev.map(p => p.id === data.id ? data : p))
        showToast('Produto atualizado!')
      } else {
        setProducts(prev => [...prev, data])
        showToast('Produto criado!')
      }
      setIsModalOpen(false)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // ── Toggle disponível ──
  const handleToggle = async (product: Product) => {
    const newVal = !product.is_available
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: newVal } : p))
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: product.id, is_available: newVal }),
      })
      if (!res.ok) throw new Error()
    } catch {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: !newVal } : p))
      showToast('Erro ao atualizar.', 'error')
    }
  }

  // ── Excluir ──
  const handleDelete = async (product: Product) => {
    if (!confirm(`Excluir "${product.name}"? Esta ação não pode ser desfeita.`)) return
    try {
      const res = await fetch(`/api/admin/products?id=${product.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setProducts(prev => prev.filter(p => p.id !== product.id))
      showToast('Produto excluído!')
    } catch {
      showToast('Erro ao excluir.', 'error')
    }
  }

  // ── Preços: adicionar/remover linha ──
  const addPrice = () => setForm(prev => ({ ...prev, prices: [...prev.prices, { size_name: '', price: 0 }] }))
  const removePrice = (i: number) => setForm(prev => ({ ...prev, prices: prev.prices.filter((_, idx) => idx !== i) }))
  const updatePrice = (i: number, field: 'size_name' | 'price', value: string | number) => {
    setForm(prev => ({
      ...prev,
      prices: prev.prices.map((p, idx) => idx === i ? { ...p, [field]: value } : p),
    }))
  }

  // ── Filtros ──
  const filtered = products.filter(p => {
    const matchCat = filterCat === 'all' || p.category_id === filterCat
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

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
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-black text-gray-900 text-sm uppercase tracking-tight">Produtos</h1>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
              {products.length}
            </span>
          </div>
          <button
            onClick={openCreate}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow transition active:scale-[0.98] flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Novo Produto
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-5 space-y-4">

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[160px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
            />
          </div>
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 font-medium"
          >
            <option value="all">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Lista de produtos */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-16 flex flex-col items-center text-center">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-sm font-bold text-gray-400">Nenhum produto encontrado</p>
            <button onClick={openCreate} className="mt-4 text-sm font-bold text-red-600 hover:underline">
              Criar primeiro produto →
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(product => (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 p-3 hover:shadow-md transition"
              >
                {/* Imagem */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-orange-50 to-red-50 border border-gray-100 shrink-0">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🍕</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                    {product.allows_half_half && (
                      <span className="text-[9px] font-bold text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-1.5 py-0.5">½ a ½</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{product.category.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {product.product_prices.map(pp => (
                      <span key={pp.size_name} className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">
                        {pp.size_name}: R$ {pp.price.toFixed(2)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Toggle disponível */}
                  <button
                    onClick={() => handleToggle(product)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${product.is_available ? 'bg-green-500' : 'bg-gray-200'}`}
                    title={product.is_available ? 'Desativar' : 'Ativar'}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${product.is_available ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>

                  {/* Editar */}
                  <button
                    onClick={() => openEdit(product)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Excluir */}
                  <button
                    onClick={() => handleDelete(product)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL CRIAR/EDITAR ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col">

            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scroll body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Imagem */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Imagem</label>
                <div
                  className="relative w-full h-36 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-red-400 transition group"
                  onClick={() => imageInputRef.current?.click()}
                >
                  {form.image_url ? (
                    <>
                      <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Trocar imagem</span>
                      </div>
                    </>
                  ) : uploadingImage ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-gray-400 font-medium">Clique para enviar</span>
                    </div>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                {form.image_url && (
                  <button onClick={() => setForm(p => ({ ...p, image_url: '' }))} className="mt-1 text-xs text-red-400 hover:text-red-600 font-medium">
                    Remover imagem
                  </button>
                )}
              </div>

              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Pizza Calabresa"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Descrição</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Ingredientes, detalhes..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none"
                />
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Categoria *</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                >
                  <option value="">Selecione...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Preços */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tamanhos e Preços *</label>
                  <button onClick={addPrice} className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {form.prices.map((price, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Tamanho (ex: Grande)"
                        value={price.size_name}
                        onChange={e => updatePrice(i, 'size_name', e.target.value)}
                        className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                      />
                      <div className="relative w-28 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">R$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={price.price}
                          onChange={e => updatePrice(i, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                        />
                      </div>
                      {form.prices.length > 1 && (
                        <button onClick={() => removePrice(i)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-red-50 text-gray-300 hover:text-red-500 transition shrink-0">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Opções */}
              <div className="flex gap-3">
                <label className="flex-1 flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={form.is_available}
                    onChange={e => setForm(p => ({ ...p, is_available: e.target.checked }))}
                    className="w-4 h-4 accent-red-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-800">Disponível</p>
                    <p className="text-[10px] text-gray-400">Visível no cardápio</p>
                  </div>
                </label>
                <label className="flex-1 flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="checkbox"
                    checked={form.allows_half_half}
                    onChange={e => setForm(p => ({ ...p, allows_half_half: e.target.checked }))}
                    className="w-4 h-4 accent-red-600"
                  />
                  <div>
                    <p className="text-xs font-bold text-gray-800">Meia a meia</p>
                    <p className="text-[10px] text-gray-400">Permite 2 sabores</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer modal */}
            <div className="px-5 pb-6 pt-3 border-t border-gray-100 flex gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl font-black text-xs uppercase text-gray-500 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-black text-xs uppercase shadow-lg transition active:scale-[0.98]"
              >
                {isSaving ? 'Salvando...' : editingProduct ? 'Salvar Alterações' : 'Criar Produto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}