'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function SettingsPage() {
  const [pizzaria, setPizzaria] = useState<any>(null)
  const [address, setAddress] = useState('')
  const [uploading, setUploading] = useState(false)
  
  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from('pizzarias').select('*').single()
      if (data) {
        setPizzaria(data)
        setAddress(data.address || '')
      }
    }
    fetchData()
  }, [])

  const handleLogoUpload = async (event: any) => {
    try {
      const file = event.target.files[0]
      if (!file) return

      // --- VALIDAÇÃO DE TAMANHO ---
      const MAX_SIZE_MB = 2
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`O arquivo é muito grande! O máximo permitido é ${MAX_SIZE_MB}MB.`)
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
      alert('Erro ao enviar imagem. Verifique se o Bucket "images" foi criado.')
      console.log(error)
    } finally {
      setUploading(false)
    }
  }

  const handleSaveAddress = async () => {
    const { error } = await supabase
      .from('pizzarias')
      .update({ address })
      .eq('id', pizzaria.id)
    
    if (!error) alert('Endereço salvo!')
    else alert('Erro ao salvar endereço')
  }

  if (!pizzaria) return <div className="p-8">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow px-6 py-4 flex gap-4 items-center">
        <Link href="/admin/dashboard" className="text-gray-500 hover:text-red-600">← Voltar aos Pedidos</Link>
        <h1 className="text-xl font-bold text-gray-800">Configurações da Pizzaria</h1>
      </nav>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        
        {/* LOGO */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-bold text-lg mb-4">Logo da Pizzaria</h2>
          <div className="flex items-start gap-6">
            <div className="w-32 h-32 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-200 flex items-center justify-center relative shrink-0">
              {pizzaria.logo_url ? (
                <img src={pizzaria.logo_url} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-400">Sem Logo</span>
              )}
            </div>
            <div>
              <label className={`px-4 py-2 rounded cursor-pointer transition inline-block ${uploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                {uploading ? 'Enviando...' : 'Alterar Logo'}
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploading} />
              </label>
              
              <div className="mt-3 text-sm text-gray-500 space-y-1">
                <p>✅ <strong>Tamanho ideal:</strong> Quadrado (500x500px)</p>
                <p>✅ <strong>Formato:</strong> JPG ou PNG</p>
                <p>⚠️ <strong>Máximo:</strong> 2MB para não travar o cardápio</p>
              </div>
            </div>
          </div>
        </div>

        {/* ENDEREÇO */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-bold text-lg mb-4">Endereço e Rodapé</h2>
          <div>
            <label className="block text-sm font-semibold text-gray-700">Endereço Completo</label>
            <textarea 
              className="w-full mt-1 p-3 border rounded text-black" 
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Rua das Flores, 123 - Centro, Salvador - BA"
            />
          </div>
          <button onClick={handleSaveAddress} className="mt-4 bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700">
            Salvar Endereço
          </button>
        </div>

      </div>
    </div>
  )
}