'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation' // Adicionado

export default function SettingsPage() {
  const router = useRouter() // Adicionado
  const [pizzaria, setPizzaria] = useState<any>(null)
  
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true) // Novo estado de loading
  
  useEffect(() => {
    const fetchData = async () => {
      // 1. Verificar Login
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/admin')
        return
      }

      try {
        // 2. Descobrir qual pizzaria este usuário administra
        const { data: adminLink, error: linkError } = await supabase
          .from('admin_users')
          .select('pizzaria_id')
          .eq('user_id', session.user.id)
          .single()

        if (linkError || !adminLink) {
          alert('Erro de permissão: Usuário não vinculado a nenhuma pizzaria.')
          router.push('/admin/dashboard')
          return
        }

        // 3. Buscar os dados DA PIZZARIA CERTA
        const { data } = await supabase
            .from('pizzarias')
            .select('*')
            .eq('id', adminLink.pizzaria_id) // <--- O FILTRO IMPORTANTE
            .single()
        
        if (data) {
            setPizzaria(data)
            setName(data.name || '')
            setAddress(data.address || '')
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  const handleLogoUpload = async (event: any) => {
    try {
      const file = event.target.files[0]
      if (!file) return

      if (file.size > 2 * 1024 * 1024) {
        alert('A imagem é muito grande! Use um arquivo menor que 2MB.')
        return
      }

      setUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `logo-${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('images').getPublicUrl(filePath)
      const publicUrl = data.publicUrl

      const { error: dbError } = await supabase
        .from('pizzarias')
        .update({ logo_url: publicUrl })
        .eq('id', pizzaria.id)

      if (dbError) throw dbError

      setPizzaria({ ...pizzaria, logo_url: publicUrl })
      alert('Logo atualizada com sucesso!')
    } catch (error) {
      alert('Erro ao enviar imagem. Tente novamente.')
      console.log(error)
    } finally {
      setUploading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!name.trim()) return alert('O nome da empresa não pode ficar vazio.')

    setSaving(true)
    const { error } = await supabase
      .from('pizzarias')
      .update({ 
        name: name,
        address: address 
      })
      .eq('id', pizzaria.id)
    
    if (!error) {
      alert('Dados da empresa atualizados com sucesso!')
      setPizzaria({ ...pizzaria, name, address })
    } else {
      alert('Erro ao salvar dados.')
      console.error(error)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-10 text-center animate-pulse">Carregando configurações...</div>
  if (!pizzaria) return <div className="p-10 text-center text-red-500">Erro ao carregar pizzaria.</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <nav className="bg-white shadow px-6 py-4 flex gap-4 items-center mb-6">
        <Link href="/admin/dashboard" className="text-gray-500 hover:text-red-600 font-medium">← Voltar ao Painel</Link>
        <h1 className="text-xl font-bold text-gray-800">Configurações: {pizzaria.name}</h1>
      </nav>

      <div className="max-w-2xl mx-auto px-4 space-y-6">
        
        {/* CARD DA LOGO */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
            📸 Logo da Empresa
          </h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-4 border-white shadow-md flex items-center justify-center relative shrink-0">
              {pizzaria.logo_url ? (
                <img src={pizzaria.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400 text-2xl">🍕</span>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <label className={`inline-block px-6 py-3 rounded-lg cursor-pointer transition font-bold text-sm shadow-sm ${uploading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                {uploading ? 'Enviando foto...' : 'Alterar Logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
              </label>
              
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>✅ Formato: <strong>JPG</strong> ou <strong>PNG</strong></p>
                <p>✅ Tamanho ideal: <strong>Quadrado (500x500)</strong></p>
              </div>
            </div>
          </div>
        </div>

        {/* CARD DOS DADOS */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
            📝 Dados da Empresa
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Nome Fantasia</label>
              <input 
                type="text"
                className="w-full p-3 border rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition"
                placeholder="Ex: Pizzaria do Sertão"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Endereço Completo (Rodapé)</label>
              <textarea 
                className="w-full p-3 border rounded-lg text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition" 
                rows={3}
                placeholder="Ex: Rua das Flores, 123 - Centro, Salvador - BA"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="pt-2">
                <button 
                    onClick={handleSaveSettings} 
                    disabled={saving}
                    className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-70 flex justify-center items-center gap-2"
                >
                    {saving ? 'Salvando...' : '💾 Salvar Alterações'}
                </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}