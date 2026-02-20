'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProductPrice {
  id?: string
  size_name: string
  price: number
}

interface Product {
  id: string
  name: string
  description: string
  image_url: string
  category_id: string
  allows_half_half: boolean
  is_available: boolean
  product_prices: ProductPrice[]
}

interface Category {
  id: string
  name: string
}

export default function AdminProductsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pizzariaId, setPizzariaId] = useState<string | null>(null)
  
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  
  // Filtro de Abas
  const [activeTabId, setActiveTabId] = useState<string>('all')

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  
  // Estados de Edição
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/admin')

      try {
        const { data: adminLink } = await supabase
          .from('admin_users')
          .select('pizzaria_id')
          .eq('user_id', session.user.id)
          .single()

        if (!adminLink) throw new Error('Vínculo não encontrado')
        setPizzariaId(adminLink.pizzaria_id)

        const [catsRes, prodsRes] = await Promise.all([
          supabase.from('categories').select('*').eq('pizzaria_id', adminLink.pizzaria_id).order('name'),
          supabase.from('products').select('*, product_prices(*)').eq('pizzaria_id', adminLink.pizzaria_id).order('name')
        ])

        setCategories(catsRes.data || [])
        setProducts(prodsRes.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [router])

  // --- FILTRAGEM ---
  const filteredCategories = activeTabId === 'all' 
    ? categories 
    : categories.filter(c => c.id === activeTabId)

  // --- GESTÃO DE CATEGORIAS ---
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategoryName || !pizzariaId) return
    setIsSaving(true)

    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: newCategoryName, pizzaria_id: pizzariaId })
        .select().single()

      if (error) throw error
      setCategories([...categories, data])
      setNewCategoryName('')
      setIsCategoryModalOpen(false)
    } catch (err: any) {
      alert('Erro: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // --- GESTÃO DE PRODUTOS ---
  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pizzariaId || !editingProduct) return
    setIsSaving(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `prod-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('logos').upload(`products/${fileName}`, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(`products/${fileName}`)
      setEditingProduct({ ...editingProduct, image_url: publicUrl })
    } catch (err: any) {
      alert('Erro upload: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !pizzariaId) return
    setIsSaving(true)

    try {
      const { data: savedProd, error: prodError } = await supabase
        .from('products')
        .upsert({
          id: editingProduct.id || undefined,
          pizzaria_id: pizzariaId,
          name: editingProduct.name,
          description: editingProduct.description,
          image_url: editingProduct.image_url,
          category_id: editingProduct.category_id,
          allows_half_half: editingProduct.allows_half_half,
          is_available: editingProduct.is_available
        })
        .select().single()

      if (prodError) throw prodError

      if (editingProduct.id) await supabase.from('product_prices').delete().eq('product_id', editingProduct.id)
      const pricesToInsert = editingProduct.product_prices.map(p => ({
        product_id: savedProd.id,
        size_name: p.size_name,
        price: p.price
      }))
      await supabase.from('product_prices').insert(pricesToInsert)

      alert('✅ Produto atualizado!')
      window.location.reload()
    } catch (err: any) {
      alert('Erro salvar: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="p-10 text-center animate-pulse font-bold text-gray-400 uppercase tracking-widest">Carregando Estoque...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER FIXO */}
      <nav className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-xs font-black uppercase text-gray-400 hover:text-black transition">← Painel</Link>
          <div className="flex gap-2">
            <button onClick={() => setIsCategoryModalOpen(true)} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold text-xs hover:bg-gray-200 transition uppercase">Categorias</button>
            <button 
              onClick={() => {
                setEditingProduct({
                  id: '', name: '', description: '', image_url: '', 
                  category_id: categories[0]?.id || '', allows_half_half: false, 
                  is_available: true, product_prices: [{ size_name: 'Único', price: 0 }]
                })
                setIsProductModalOpen(true)
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-red-700 shadow-lg shadow-red-100 transition uppercase tracking-widest"
            >
              + Novo Produto
            </button>
          </div>
        </div>
      </nav>

      {/* ABAS DE CATEGORIAS (FILTRO) */}
      <div className="bg-white border-b sticky top-[65px] z-30 overflow-x-auto no-scrollbar">
        <div className="max-w-6xl mx-auto flex px-4">
          <button 
            onClick={() => setActiveTabId('all')}
            className={`py-4 px-6 text-xs font-black uppercase whitespace-nowrap border-b-2 transition ${
              activeTabId === 'all' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400'
            }`}
          >
            Tudo ({products.length})
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveTabId(cat.id)}
              className={`py-4 px-6 text-xs font-black uppercase whitespace-nowrap border-b-2 transition ${
                activeTabId === cat.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400'
              }`}
            >
              {cat.name} ({products.filter(p => p.category_id === cat.id).length})
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM DINÂMICA */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-12 pb-20">
        {filteredCategories.map((cat) => (
          <div key={cat.id} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">{cat.name}</h2>
              <div className="h-[2px] flex-1 bg-gray-200"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.filter(p => p.category_id === cat.id).map((product) => (
                <div key={product.id} className="bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col group hover:border-red-500 transition-all duration-300">
                  <div className="h-40 bg-gray-100 relative">
                    {product.image_url ? (
                      <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl opacity-20">🍕</div>
                    )}
                    {!product.is_available && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] flex items-center justify-center">
                        <span className="text-[10px] font-black text-red-600 border-2 border-red-600 px-2 py-1 rounded-lg uppercase tracking-widest rotate-[-5deg]">Pausado</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex-1">
                    <h3 className="font-black text-gray-800 text-lg leading-none mb-2">{product.name}</h3>
                    <p className="text-[10px] text-gray-400 font-medium line-clamp-2 mb-4 uppercase leading-relaxed">{product.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {product.product_prices.map((p, i) => (
                        <div key={i} className="bg-gray-50 border px-2 py-1 rounded-lg flex flex-col">
                          <span className="text-[8px] font-black text-gray-400 uppercase">{p.size_name}</span>
                          <span className="text-xs font-black text-green-600">R$ {Number(p.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => { setEditingProduct(product); setIsProductModalOpen(true); }}
                    className="m-4 mt-0 py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition shadow-lg shadow-gray-200 active:scale-95"
                  >
                    Editar Produto
                  </button>
                </div>
              ))}
              {products.filter(p => p.category_id === cat.id).length === 0 && (
                <div className="col-span-full py-12 border-2 border-dashed rounded-3xl text-center">
                   <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Nenhum produto cadastrado nesta categoria.</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </main>

      {/* MODAL CATEGORIAS */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8">
            <h3 className="text-xl font-black text-gray-800 mb-6 uppercase tracking-tight">📁 Categorias</h3>
            <form onSubmit={handleSaveCategory} className="space-y-4">
              <div className="flex gap-2">
                <input type="text" placeholder="Nome da categoria" className="flex-1 p-3 border rounded-xl text-sm focus:ring-2 focus:ring-red-500 outline-none" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button type="submit" disabled={isSaving} className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold text-xs uppercase">Criar</button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 pt-4">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-black text-gray-700 uppercase">{cat.name}</span>
                    <button type="button" onClick={async () => {
                       if(confirm('Excluir categoria?')) {
                         await supabase.from('categories').delete().eq('id', cat.id)
                         setCategories(categories.filter(c => c.id !== cat.id))
                       }
                    }} className="text-red-400 hover:text-red-600 font-bold">✕</button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fechar Janela</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PRODUTO */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full my-8 animate-in zoom-in-95">
            <form onSubmit={handleSaveProduct}>
              <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white rounded-t-3xl z-10">
                <h3 className="text-lg font-black uppercase text-gray-800 tracking-widest">Configurar Item</h3>
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="text-gray-400 text-2xl">✕</button>
              </div>
              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-full aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                      {editingProduct.image_url ? <img src={editingProduct.image_url} className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400 uppercase font-black">Sem Foto</span>}
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleUploadImage} className="hidden" accept="image/*" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-red-600 uppercase underline tracking-widest">Upload Foto</button>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Nome do Produto</label>
                      <input type="text" required className="w-full p-3 border rounded-xl text-sm outline-none" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Categoria Pai</label>
                      <select required className="w-full p-3 border rounded-xl text-sm bg-white outline-none" value={editingProduct.category_id} onChange={e => setEditingProduct({...editingProduct, category_id: e.target.value})}>
                        <option value="">Selecione...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Descrição / Receita</label>
                  <textarea className="w-full p-3 border rounded-xl text-sm outline-none bg-gray-50 focus:bg-white" rows={2} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} />
                </div>
                
                {/* PREÇOS */}
                <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-black text-gray-400 uppercase">Grade de Preços</h4>
                    <button type="button" onClick={() => setEditingProduct({...editingProduct, product_prices: [...editingProduct.product_prices, { size_name: '', price: 0 }]})} className="text-[9px] bg-gray-200 px-3 py-1 rounded-full font-black uppercase">+ Novo Tamanho</button>
                  </div>
                  <div className="space-y-3">
                    {editingProduct.product_prices.map((price, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input type="text" placeholder="Tamanho (G, M, Brotinho)" className="flex-1 p-2 border rounded-xl text-xs outline-none" value={price.size_name} onChange={e => {
                          const newPrices = [...editingProduct.product_prices]; newPrices[idx].size_name = e.target.value; setEditingProduct({...editingProduct, product_prices: newPrices});
                        }} />
                        <input type="number" step="0.01" className="w-24 p-2 border rounded-xl text-xs font-bold" value={price.price} onChange={e => {
                          const newPrices = [...editingProduct.product_prices]; newPrices[idx].price = Number(e.target.value); setEditingProduct({...editingProduct, product_prices: newPrices});
                        }} />
                        <button type="button" onClick={() => setEditingProduct({...editingProduct, product_prices: editingProduct.product_prices.filter((_, i) => i !== idx)})} className="text-red-400 p-1">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-red-600" checked={editingProduct.allows_half_half} onChange={e => setEditingProduct({...editingProduct, allows_half_half: e.target.checked})} /><span className="text-[10px] font-black text-gray-500 uppercase">Permitir Meio a Meio?</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-green-600" checked={editingProduct.is_available} onChange={e => setEditingProduct({...editingProduct, is_available: e.target.checked})} /><span className="text-[10px] font-black text-gray-500 uppercase">Ativo no Cardápio?</span></label>
                </div>
              </div>
              <div className="p-6 border-t flex gap-4 bg-gray-50 rounded-b-3xl">
                <button type="button" onClick={() => setIsProductModalOpen(false)} className="flex-1 py-4 border-2 rounded-2xl font-black text-gray-400 uppercase text-[10px] tracking-widest hover:bg-gray-100 transition">Cancelar</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}