// middleware.ts — raiz do projeto (ao lado de package.json)
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

// Rate limit simples em memória (reinicia ao reiniciar o server)
// Para produção, use Redis/Upstash
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 20        // máx requisições
const RATE_WINDOW = 60_000   // por minuto

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Rate limit na rota pública de pedidos ──
  if (pathname === '/api/orders') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em 1 minuto.' },
        { status: 429 }
      )
    }
  }

  // ── Proteção das rotas /admin ──
  const isAdminRoute  = pathname.startsWith('/admin')
  const isLoginPage   = pathname === '/admin' || pathname === '/admin/'
  const isLoginApi    = pathname === '/api/admin/login'
  const isPublicApi   = pathname.startsWith('/api/track') || pathname === '/api/orders'

  // Rotas públicas — passa direto
  if (!isAdminRoute || isLoginPage || isLoginApi || isPublicApi) {
    return NextResponse.next()
  }

  // Verifica JWT para rotas admin protegidas
  const token = req.cookies.get('admin_token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/admin', req.url))
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/admin', req.url))
    response.cookies.delete('admin_token')
    return response
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/orders',
  ],
}