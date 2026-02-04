'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', description: '', category_id: '', image_url: '' })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: prods } = await supabase.from('products').select('*').order('name')
    const { data: cats } = await supabase.from('categories').select('*')
    if (prods) setProducts(prods)
    if (cats) setCategories(cats)
  }

  const handleImageUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    // --- VALIDAÇÃO DE TAMANHO ---
    const MAX_SIZE_MB = 2
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`O arquivo é muito grande! O máximo permitido é ${MAX_SIZE_MB}MB para garantir rapidez no cardápio.`)
        return
    }
    // ----------------------------

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `products/${Date.now()}.${fileExt}`
    
    // Upload
    const { error } = await supabase.storage.from('images').upload(fileName, file)
    
    if (!error) {
      const { data } = supabase.storage.from('images').getPublicUrl(fileName)
      setFormData({ ...formData, image_url: data.publicUrl })
    } else {
      alert('Erro no upload da imagem')
      console.error(error)
    }
    setUploading(false)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.category_id) return alert('Preencha nome e categoria')

    const payload = {
      name: formData.name,
      description: formData.description,
      category_id: formData.category_id,
      image_url: formData.image_url,
      is_available: true
    }

    let error
    if (formData.id) {
      const res = await supabase.from('products').update(payload).eq('id', formData.id)
      error = res.error
    } else {
      const cat = categories.find(c => c.id === formData.category_id)
      if (!cat) return alert('Categoria inválida')

      const res = await supabase.from('products').insert({ ...payload, pizzaria_id: cat.pizzaria_id })
      error = res.error
    }

    if (!error) {
      setIsEditing(false)
      setFormData({ id: '', name: '', description: '', category_id: '', image_url: '' })
      fetchData()
    } else {
      alert('Erro ao salvar produto')
      console.error(error)
    }
  }

  const handleEdit = (prod: any) => {
    setFormData({ 
      id: prod.id, 
      name: prod.name, 
      description: prod.description || '', 
      category_id: prod.category_id, 
      image_url: prod.image_url || '' 
    })
    setIsEditing(true)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex gap-4 items-center justify-between">
        <div className="flex gap-4 items-center">
            <Link href="/admin/dashboard" className="text-gray-500 hover:text-red-600">← Voltar</Link>
            <h1 className="text-xl font-bold text-gray-800">Gerenciar Sabores/Produtos</h1>
        </div>
        <button onClick={() => setIsEditing(true)} className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700">+ Novo Produto</button>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        
        {/* FORMULÁRIO DE EDIÇÃO */}
        {isEditing && (
          <div className="bg-white p-6 rounded-lg shadow mb-6 border-l-4 border-green-500 animate-in fade-in slide-in-from-top-4">
            <h2 className="font-bold text-lg mb-4">{formData.id ? 'Editar Produto' : 'Novo Produto'}</h2>
            <div className="grid gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input 
                  placeholder="Ex: Calabresa" 
                  className="w-full border p-2 rounded mt-1" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea 
                  placeholder="Ex: Molho, mussarela, calabresa e cebola" 
                  className="w-full border p-2 rounded mt-1" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Categoria</label>
                <select 
                  className="w-full border p-2 rounded mt-1 bg-white"
                  value={formData.category_id}
                  onChange={e => setFormData({...formData, category_id: e.target.value})}
                >
                  <option value="">Selecione a Categoria...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              {/* Upload de Imagem do Produto */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Foto do Produto</label>
                <div className="mt-1 border p-4 rounded bg-gray-50 flex flex-col sm:flex-row items-center gap-4">
                  {formData.image_url ? (
                    <img src={formData.image_url} className="w-24 h-16 object-cover rounded border" />
                  ) : (
                    <div className="w-24 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Sem foto</div>
                  )}
                  
                  <div className="flex-1">
                    <input type="file" onChange={handleImageUpload} disabled={uploading} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-2" />
                    <p className="text-xs text-gray-500">
                      Recomendado: <strong>800x600px</strong> (Retangular). Máx: <strong>2MB</strong>.
                    </p>
                  </div>
                  
                  {uploading && <span className="text-sm text-blue-600 font-bold animate-pulse">Enviando...</span>}
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                <button onClick={handleSave} disabled={uploading} className="px-6 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 disabled:opacity-50">
                  {uploading ? 'Aguarde...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LISTA DE PRODUTOS */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600 text-sm uppercase">
              <tr>
                <th className="p-4">Foto</th>
                <th className="p-4">Nome</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(prod => (
                <tr key={prod.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    {prod.image_url ? (
                      <img src={prod.image_url} className="w-16 h-12 rounded object-cover border" />
                    ) : <div className="w-16 h-12 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">📷</div>}
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-gray-800">{prod.name}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{prod.description}</p>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded">
                      {categories.find(c => c.id === prod.category_id)?.name}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => handleEdit(prod)} className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-bold">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">Nenhum produto cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}