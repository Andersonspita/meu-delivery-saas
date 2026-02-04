import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Debug: Se estiver vazio, avisa no terminal
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas!')
  console.error('Verifique seu arquivo .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)