'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface OperatingHour {
  id?: string
  day_of_week: number
  opening_time: string
  closing_time: string
  is_closed: boolean
}

const DAYS_NAME = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]

export default function AdminOperatingHoursPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [pizzariaId, setPizzariaId] = useState<string | null>(null)
  const [hours, setHours] = useState<OperatingHour[]>([])

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

        if (!adminLink) throw new Error('Acesso negado')
        setPizzariaId(adminLink.pizzaria_id)

        const { data: hoursData } = await supabase
          .from('operating_hours')
          .select('*')
          .eq('pizzaria_id', adminLink.pizzaria_id)
          .order('day_of_week')

        // Se o banco estiver vazio, inicializa os 7 dias
        if (!hoursData || hoursData.length === 0) {
          const initial = DAYS_NAME.map((_, i) => ({
            day_of_week: i,
            opening_time: '18:00',
            closing_time: '23:00',
            is_closed: false
          }))
          setHours(initial)
        } else {
          setHours(hoursData)
        }
      } catch (err) { console.error(err) } finally { setIsLoading(false) }
    }
    fetchData()
  }, [router])

  const handleSave = async () => {
    if (!pizzariaId) return
    setIsSaving(true)

    try {
      const payload = hours.map(h => ({
        ...h,
        pizzaria_id: pizzariaId,
        // Limpa IDs vazios para o Upsert funcionar
        id: h.id || undefined 
      }))

      const { error } = await supabase
        .from('operating_hours')
        .upsert(payload, { onConflict: 'pizzaria_id, day_of_week' })

      if (error) throw error
      alert('✅ Horários atualizados com sucesso!')
      router.refresh()
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="p-10 text-center animate-pulse font-black text-gray-400 uppercase">Configurando Relógio...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <Link href="/admin/dashboard" className="text-xs font-black uppercase text-gray-400 hover:text-black transition">← Voltar</Link>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-purple-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-purple-100 disabled:opacity-50"
          >
            {isSaving ? 'Salvando...' : 'Salvar Horários'}
          </button>
        </div>
      </nav>

      <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full">
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b bg-purple-50">
            <h2 className="text-sm font-black text-purple-900 uppercase tracking-widest">Horários de Funcionamento</h2>
            <p className="text-[10px] text-purple-400 font-bold uppercase mt-1">O cardápio fechará automaticamente fora destes períodos</p>
          </div>

          <div className="divide-y">
            {hours.map((item, idx) => (
              <div key={idx} className={`p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${item.is_closed ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                <div className="min-w-[120px]">
                  <h3 className="font-black text-gray-800 uppercase tracking-tighter">{DAYS_NAME[item.day_of_week]}</h3>
                </div>

                <div className="flex items-center gap-3">
                  <input 
                    type="time" 
                    disabled={item.is_closed}
                    className="p-2 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-200"
                    value={item.opening_time}
                    onChange={e => {
                      const newHours = [...hours];
                      newHours[idx].opening_time = e.target.value;
                      setHours(newHours);
                    }}
                  />
                  <span className="text-gray-300 font-black">às</span>
                  <input 
                    type="time" 
                    disabled={item.is_closed}
                    className="p-2 border rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-200"
                    value={item.closing_time}
                    onChange={e => {
                      const newHours = [...hours];
                      newHours[idx].closing_time = e.target.value;
                      setHours(newHours);
                    }}
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 accent-red-600"
                    checked={item.is_closed}
                    onChange={e => {
                      const newHours = [...hours];
                      newHours[idx].is_closed = e.target.checked;
                      setHours(newHours);
                    }}
                  />
                  <span className="text-[10px] font-black text-gray-400 uppercase">Fechado</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}