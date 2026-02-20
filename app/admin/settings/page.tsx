'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminSettingsPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pizzaria, setPizzaria] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    whatsapp: '', // Alterado de phone para whatsapp
    address: '',
    logo_url: '',
    slug: ''
  })

  useEffect(() => {
    const fetchSettings = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.push('/admin')

      try {
        const { data: adminLink } = await supabase
          .from('admin_users')
          .select('pizzaria_id')
          .eq('user_id', session.user.id)
          .single()

        if (!adminLink) throw new Error('Vínculo não encontrado')

        const { data: pizzariaData } = await supabase
          .from('pizzarias')
          .select('*')
          .eq('id', adminLink.pizzaria_id)
          .single()

        if (pizzariaData) {
          setPizzaria(pizzariaData)
          setFormData({
            name: pizzariaData.name || '',
            whatsapp: pizzariaData.whatsapp || '', // Bate com o banco
            address: pizzariaData.address || '',
            logo_url: pizzariaData.logo_url || '',
            slug: pizzariaData.slug || ''
          })
        }
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [router])

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !pizzaria) return

    setIsSaving(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${pizzaria.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('logos')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, logo_url: publicUrl }))
      alert('Imagem carregada! Não esqueça de Salvar as Alterações abaixo.')
      
    } catch (err: any) {
      alert('Erro no upload: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Aqui usamos 'whatsapp' que é o nome da coluna no seu banco
      const { error } = await supabase
        .from('pizzarias')
        .update({
          name: formData.name,
          whatsapp: formData.whatsapp, // Ajustado para a coluna correta
          address: formData.address,
          logo_url: formData.logo_url,
          slug: formData.slug.toLowerCase().replace(/\s+/g, '-')
        })
        .eq('id', pizzaria.id)

      if (error) throw error

      alert('✅ Configurações salvas com sucesso!')
      router.refresh() 
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="p-10 text-center animate-pulse">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-gray-500 font-bold flex items-center gap-2 hover:text-black transition">
            ← Voltar ao Painel
          </Link>
          <button 
            form="settings-form"
            disabled={isSaving}
            className={`px-6 py-2 rounded-lg font-bold text-sm ${
              isSaving ? 'bg-gray-400' : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
            }`}
          >
            {isSaving ? 'Processando...' : 'Salvar Alterações'}
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <form id="settings-form" onSubmit={handleSave} className="space-y-6">
          
          <div className="bg-white rounded-2xl border p-6 flex flex-col items-center">
            <h2 className="text-sm font-black text-gray-400 uppercase mb-6">Logo da Pizzaria</h2>
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-gray-100 shadow-inner overflow-hidden bg-gray-50 flex items-center justify-center">
                {formData.logo_url ? (
                  <img src={formData.logo_url} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🍕</span>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleUploadImage} accept="image/*" className="hidden" />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-red-600 text-white p-2 rounded-full shadow-lg hover:bg-red-700 transition"
              >
                📸
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-6 space-y-4">
            <h2 className="text-sm font-black text-gray-400 uppercase mb-2">Informações Gerais</h2>
            
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">NOME DA PIZZARIA</label>
              <input 
                type="text" 
                required
                className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">WHATSAPP (COM DDD)</label>
                <input 
                  type="text" 
                  required
                  placeholder="71999998888"
                  className="w-full p-3 border rounded-xl outline-none"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">LINK DO CARDÁPIO (SLUG)</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-3 border rounded-xl outline-none font-mono text-sm"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ENDEREÇO</label>
              <textarea 
                rows={3}
                className="w-full p-3 border rounded-xl outline-none"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}