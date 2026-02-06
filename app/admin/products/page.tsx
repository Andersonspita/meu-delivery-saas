'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AdminProducts() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([]) // <--- NOVO: Lista de categorias
  const [pizzariaId, setPizzariaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Estados para Edição / Criação
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [pricesToDelete, setPricesToDelete] = useState<number[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/admin')
      return
    }

    // 1. Descobrir Pizzaria
    const { data: adminLink } = await supabase
      .from('admin_users')
      .select('pizzaria_id')
      .eq('user_id', session.user.id)
      .single()

    if (!adminLink) {
        alert('Erro: Usuário sem pizzaria vinculada.')
        return
    }

    const pId = adminLink.pizzaria_id
    setPizzariaId(pId)

    // 2. Buscar Produtos
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select('*, categories(name), product_prices(*)') 
      .eq('pizzaria_id', pId)
      .order('name')

    if (prodError) console.error('Erro produtos:', prodError)
    else setProducts(prodData || [])

    // 3. Buscar Categorias (NOVO)
    const { data: catData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('pizzaria_id', pId)
        .order('name')
    
    if (catError) console.error('Erro categorias:', catError)
    else setCategories(catData || [])
    
    setLoading(false)
  }

  // --- Funções Auxiliares (Delete, Toggle) ---
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .eq('pizzaria_id', pizzariaId)

    if (error) alert('Erro ao deletar.')
    else setProducts(products.filter(p => p.id !== id))
  }

  const toggleAvailability = async (product: any) => {
    const { error } = await supabase
        .from('products')
        .update({ is_available: !product.is_available })
        .eq('id', product.id)
        .eq('pizzaria_id', pizzariaId)

    if (!error) {
        setProducts(products.map(p => p.id === product.id ? { ...p, is_available: !p.is_available } : p))
    }
  }

  // --- LÓGICA DO MODAL ---
  
  const handleOpenCreate = () => {
    // Tenta pegar a primeira categoria como padrão para facilitar
    const defaultCat = categories.length > 0 ? categories[0].id : ''

    setEditingProduct({
        name: '',
        description: '',
        image_url: '',
        is_available: true,
        category_id: defaultCat, // <--- Define categoria padrão
        product_prices: []
    })
    setPricesToDelete([]) 
    setIsModalOpen(true)
  }

  const handleOpenEdit = (product: any) => {
    setEditingProduct(JSON.parse(JSON.stringify(product)))
    setPricesToDelete([]) 
    setIsModalOpen(true)
  }

  const handleAddPrice = () => {
    setEditingProduct({
        ...editingProduct,
        product_prices: [...(editingProduct.product_prices || []), { size_name: '', price: '' }]
    })
  }

  const handleRemovePriceRow = (index: number) => {
    const priceToRemove = editingProduct.product_prices[index]
    if (priceToRemove.id) setPricesToDelete([...pricesToDelete, priceToRemove.id])
    
    const updated = editingProduct.product_prices.filter((_:any, i:number) => i !== index)
    setEditingProduct({ ...editingProduct, product_prices: updated })
  }

  const handlePriceChange = (index: number, field: 'price' | 'size_name', value: string) => {
    const updatedPrices = [...editingProduct.product_prices]
    updatedPrices[index] = { ...updatedPrices[index], [field]: value }
    setEditingProduct({ ...editingProduct, product_prices: updatedPrices })
  }

  const handleImageUpload = async (event: any) => {
    try {
      const file = event.target.files[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) return alert('Imagem muito grande! Máximo 2MB.')

      setUploadingImage(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `prod-${Date.now()}.${fileExt}`
      const filePath = `products/${fileName}`

      const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      setEditingProduct({ ...editingProduct, image_url: data.publicUrl })
      
    } catch (error) {
      console.error(error)
      alert('Erro ao fazer upload da imagem.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleSave = async () => {
    // VALIDAÇÕES
    if (!pizzariaId) return alert('Erro Crítico: ID da Pizzaria não carregado.')
    if (!editingProduct.name.trim()) return alert('O nome do produto é obrigatório.')
    if (!editingProduct.category_id) return alert('Selecione uma Categoria para o produto.') // <--- Validação da Categoria

    setSaving(true)

    try {
        let savedProductId = editingProduct.id

        const productPayload = {
            name: editingProduct.name,
            description: editingProduct.description,
            image_url: editingProduct.image_url,
            is_available: editingProduct.is_available,
            category_id: editingProduct.category_id, // <--- ENVIA A CATEGORIA
            pizzaria_id: pizzariaId 
        }

        if (editingProduct.id) {
            const { error } = await supabase.from('products').update(productPayload).eq('id', editingProduct.id)
            if (error) throw error
        } else {
            const { data, error } = await supabase.from('products').insert(productPayload).select().single()
            if (error) throw error
            savedProductId = data.id
        }

        // PREÇOS
        if (pricesToDelete.length > 0) {
            await supabase.from('product_prices').delete().in('id', pricesToDelete)
        }

        if (editingProduct.product_prices?.length > 0) {
            for (const priceItem of editingProduct.product_prices) {
                if (!priceItem.size_name || !priceItem.price) continue;

                const pricePayload = {
                    size_name: priceItem.size_name,
                    price: parseFloat(priceItem.price),
                    product_id: savedProductId
                }

                if (priceItem.id) {
                    const { error } = await supabase.from('product_prices').update(pricePayload).eq('id', priceItem.id)
                    if (error) throw error
                } else {
                    const { error } = await supabase.from('product_prices').insert(pricePayload)
                    if (error) throw error
                }
            }
        }

        await fetchData() // Recarrega tudo
        alert('Salvo com sucesso!')
        setIsModalOpen(false)

    } catch (error: any) {
        console.error('ERRO REAL:', JSON.stringify(error, null, 2))
        alert(`Erro ao salvar: ${error.message || 'Veja o console'}`)
    } finally {
        setSaving(false)
    }
  }

  if (loading) return <div className="p-10 text-center animate-pulse">Carregando estoque...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <nav className="bg-white shadow px-4 sm:px-6 py-4 flex justify-between items-center mb-6 sticky top-0 z-10">
        <div className="flex gap-2 sm:gap-4 items-center">
            <Link href="/admin/dashboard" className="text-gray-500 hover:text-red-600 font-medium text-sm sm:text-base">← Voltar</Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">Cardápio</h1>
        </div>
        <button onClick={handleOpenCreate} className="bg-green-600 text-white px-3 py-2 rounded text-xs sm:text-sm font-bold hover:bg-green-700 shadow-sm flex items-center gap-1">
            <span className="text-lg leading-none">+</span> Novo
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-4 space-y-4">
        {products.length === 0 ? (
            <div className="text-center p-10 bg-white rounded-lg border border-dashed">
                <p className="text-gray-500 mb-4">Nenhum produto encontrado.</p>
                <button onClick={handleOpenCreate} className="text-green-600 font-bold hover:underline">Criar primeiro produto</button>
            </div>
        ) : (
            products.map((product) => (
                <div key={product.id} className={`bg-white p-4 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${!product.is_available ? 'opacity-60 bg-gray-50' : ''}`}>
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                        <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0 border border-gray-200">
                            {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xl">🍕</div>}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-gray-800 text-base leading-tight">{product.name}</h3>
                            <p className="text-xs text-gray-500 mt-1">{product.categories?.name || 'Sem categoria'}</p>
                            <p className="text-sm font-medium text-green-600 mt-1">
                                {product.product_prices?.length > 0 
                                  ? `R$ ${Math.min(...product.product_prices.map((pp:any) => pp.price)).toFixed(2)}` 
                                  : 'Sem preço definido'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0">
                        <button onClick={() => toggleAvailability(product)} className={`flex-1 sm:flex-none px-3 py-2 rounded text-xs font-bold border text-center ${product.is_available ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-200 border-gray-300'}`}>
                            {product.is_available ? 'Ativo' : 'Pausado'}
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => handleOpenEdit(product)} className="bg-blue-50 text-blue-600 border border-blue-200 p-2 rounded hover:bg-blue-100 transition" title="Editar">✏️</button>
                            <button onClick={() => handleDelete(product.id)} className="bg-red-50 text-red-500 border border-red-200 p-2 rounded hover:bg-red-100 transition" title="Excluir">🗑️</button>
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
                    <h3 className="font-bold text-lg text-gray-800">{editingProduct.id ? 'Editar' : 'Novo'} Produto</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2">✕</button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <div className="space-y-5">
                        <div className="flex flex-col items-center sm:items-start gap-3">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border shrink-0">
                                    {editingProduct.image_url ? <img src={editingProduct.image_url} className="w-full h-full object-cover" /> : <span className="w-full h-full flex items-center justify-center text-2xl">📷</span>}
                                </div>
                                <label className={`inline-block px-4 py-2 rounded-lg cursor-pointer text-xs font-bold transition ${uploadingImage ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                                    {uploadingImage ? 'Enviando...' : '📷 Foto'}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage}/>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Nome *</label>
                            <input type="text" className="w-full p-3 border rounded-lg outline-none focus:border-blue-500" value={editingProduct.name} onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})} />
                        </div>
                        
                        {/* SELEÇÃO DE CATEGORIA (NOVO) */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Categoria *</label>
                            <select 
                                className="w-full p-3 border rounded-lg outline-none focus:border-blue-500 bg-white"
                                value={editingProduct.category_id || ''}
                                onChange={(e) => setEditingProduct({...editingProduct, category_id: e.target.value})}
                            >
                                <option value="">Selecione...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            {categories.length === 0 && <p className="text-xs text-red-500 mt-1">Nenhuma categoria cadastrada.</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Descrição</label>
                            <textarea className="w-full p-3 border rounded-lg outline-none focus:border-blue-500" rows={3} value={editingProduct.description || ''} onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})} />
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="font-bold text-sm text-gray-700">💰 Preços e Tamanhos</h4>
                                <button onClick={handleAddPrice} className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 font-bold">+ Adicionar</button>
                            </div>
                            <div className="space-y-3">
                                {editingProduct.product_prices?.map((priceItem: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <input type="text" placeholder="Tamanho" className="w-1/3 p-2 border rounded-lg text-sm" value={priceItem.size_name || ''} onChange={(e) => handlePriceChange(idx, 'size_name', e.target.value)} />
                                        <div className="flex items-center relative flex-1">
                                            <span className="absolute left-2 text-gray-500 text-sm font-bold">R$</span>
                                            <input type="number" step="0.01" className="w-full pl-8 p-2 border rounded-lg font-medium" value={priceItem.price} onChange={(e) => handlePriceChange(idx, 'price', e.target.value)} />
                                        </div>
                                        <button onClick={() => handleRemovePriceRow(idx)} className="text-red-500 hover:bg-red-100 p-2 rounded">🗑️</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
                    <button onClick={() => setIsModalOpen(false)} className="px-5 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg border">Cancelar</button>
                    <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md disabled:opacity-70">
                        {saving ? 'Salvando...' : '💾 Salvar'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}