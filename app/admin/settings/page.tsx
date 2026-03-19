// app/admin/settings/page.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Pizzaria {
  id: string
  name: string
  slug: string
  whatsapp_number: string
  address: string | null
  logo_url: string | null
  banner_url: string | null
  primary_color: string | null
  is_open: boolean
  active: boolean
}

interface Toast {
  message: string
  type: 'success' | 'error'
}

export default function AdminSettingsPage() {
  const router = useRouter()
  const [pizzaria, setPizzaria] = useState<Pizzaria | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [address, setAddress] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#dc2626')
  const [isOpen, setIsOpen] = useState(true)
  const [logoUrl, setLogoUrl] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')

  // Upload states
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/admin/settings')
      if (res.status === 401) { router.push('/admin'); return }
      if (!res.ok) { setIsLoading(false); return }

      const data: Pizzaria = await res.json()
      setPizzaria(data)
      setName(data.name)
      setWhatsapp(data.whatsapp_number)
      setAddress(data.address || '')
      setPrimaryColor(data.primary_color || '#dc2626')
      setIsOpen(data.is_open)
      setLogoUrl(data.logo_url || '')
      setBannerUrl(data.banner_url || '')
      setIsLoading(false)
    }
    load()
  }, [router])

  // Upload de imagem
  const handleUpload = async (
    file: File,
    type: 'logo' | 'banner',
    setUploading: (v: boolean) => void,
    setUrl: (url: string) => void
  ) => {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setUrl(data.url)
      showToast(`${type === 'logo' ? 'Logo' : 'Banner'} enviado com sucesso!`)
    } catch (err: any) {
      showToast(err.message || 'Erro ao enviar imagem.', 'error')
    } finally {
      setUploading(false)
    }
  }

  // Salvar configurações
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          whatsapp_number: whatsapp,
          address,
          primary_color: primaryColor,
          is_open: isOpen,
          logo_url: logoUrl || null,
          banner_url: bannerUrl || null,
        }),
      })

      if (!res.ok) throw new Error('Erro ao salvar.')
      const updated = await res.json()
      setPizzaria(updated)
      showToast('Configurações salvas com sucesso!')
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle abrir/fechar loja direto
  const handleToggleOpen = async () => {
    const newValue = !isOpen
    setIsOpen(newValue)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_open: newValue }),
      })
      if (!res.ok) throw new Error()
      showToast(newValue ? '🟢 Loja aberta!' : '🔴 Loja fechada!')
    } catch {
      setIsOpen(!newValue) // reverte
      showToast('Erro ao alterar status da loja.', 'error')
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
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-white border-b px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="text-gray-400 hover:text-gray-600 transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-black text-gray-900 text-sm uppercase tracking-tight">Configurações</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider shadow transition active:scale-[0.98]"
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── STATUS DA LOJA ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Status da Loja</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {isOpen ? 'Loja visível e aceitando pedidos' : 'Loja fechada para novos pedidos'}
              </p>
            </div>
            <button
              onClick={handleToggleOpen}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                isOpen ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform duration-300 ${
                isOpen ? 'translate-x-7' : 'translate-x-0'
              }`} />
            </button>
          </div>
          <div className={`mt-4 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 ${
            isOpen ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`} />
            {isOpen ? 'Aberta agora — clientes podem fazer pedidos' : 'Fechada — cardápio visível mas sem pedidos'}
          </div>
        </div>

        {/* ── IMAGENS ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
          <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Imagens</h2>

          {/* Banner */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Banner / Capa do Cardápio
            </label>
            <div
              className="relative w-full h-32 rounded-xl overflow-hidden border-2 border-dashed border-gray-200 bg-gray-50 cursor-pointer hover:border-red-400 transition group"
              onClick={() => bannerInputRef.current?.click()}
            >
              {bannerUrl ? (
                <>
                  <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <span className="text-white text-xs font-bold">Trocar imagem</span>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  {uploadingBanner ? (
                    <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs text-gray-400 font-medium">Clique para enviar banner</span>
                      <span className="text-[10px] text-gray-300">JPG, PNG ou WebP — máx. 5MB</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file, 'banner', setUploadingBanner, setBannerUrl)
              }}
            />
            {bannerUrl && (
              <button
                onClick={() => setBannerUrl('')}
                className="mt-1.5 text-xs text-red-400 hover:text-red-600 font-medium"
              >
                Remover banner
              </button>
            )}
          </div>

          {/* Logo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              Logo da Pizzaria
            </label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden cursor-pointer hover:border-red-400 transition group shrink-0 flex items-center justify-center"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoUrl ? (
                  <div className="relative w-full h-full">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  </div>
                ) : uploadingLogo ? (
                  <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                )}
              </div>
              <div>
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="text-sm font-bold text-red-600 hover:underline"
                >
                  {logoUrl ? 'Trocar logo' : 'Enviar logo'}
                </button>
                <p className="text-xs text-gray-400 mt-0.5">Recomendado: quadrado, mín. 200x200px</p>
                {logoUrl && (
                  <button onClick={() => setLogoUrl('')} className="text-xs text-red-400 hover:text-red-600 font-medium mt-1">
                    Remover
                  </button>
                )}
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file, 'logo', setUploadingLogo, setLogoUrl)
              }}
            />
          </div>
        </div>

        {/* ── DADOS DA PIZZARIA ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight">Dados da Pizzaria</h2>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition bg-gray-50"
              placeholder="Nome da sua pizzaria"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              WhatsApp
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">+55</span>
              <input
                type="tel"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition bg-gray-50"
                placeholder="71999999999"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Somente números, com DDD. Ex: 71986959712</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Endereço
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition bg-gray-50"
              placeholder="Rua, número, bairro, cidade"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Cor principal da marca
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer bg-gray-50 p-1"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={e => setPrimaryColor(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 transition bg-gray-50"
                placeholder="#dc2626"
              />
              <div
                className="w-10 h-10 rounded-lg border border-gray-200 shrink-0"
                style={{ backgroundColor: primaryColor }}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Usada no header e botões do cardápio</p>
          </div>
        </div>

        {/* ── LINK DO CARDÁPIO ── */}
        {pizzaria && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-black text-gray-900 text-sm uppercase tracking-tight mb-3">Link do Cardápio</h2>
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
              <span className="text-sm text-gray-500 truncate flex-1">
                {typeof window !== 'undefined' ? window.location.origin : ''}/{pizzaria.slug}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${pizzaria.slug}`)
                  showToast('Link copiado!')
                }}
                className="shrink-0 text-xs font-bold text-red-600 hover:underline"
              >
                Copiar
              </button>
            </div>
            <a
              href={`/${pizzaria.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 text-xs text-gray-400 hover:text-red-600 font-medium flex items-center gap-1 transition"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Abrir cardápio
            </a>
          </div>
        )}

        {/* Botão salvar mobile */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-red-100 transition active:scale-[0.98]"
        >
          {isSaving ? 'Salvando...' : '💾 Salvar Configurações'}
        </button>

      </div>
    </div>
  )
}