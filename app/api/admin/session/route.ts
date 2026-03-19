// app/api/admin/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('admin_token')?.value
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 })

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return NextResponse.json({
      authenticated: true,
      admin: {
        id: payload.sub,
        email: payload.email,
        pizzaria_id: payload.pizzaria_id,
        pizzaria_slug: payload.pizzaria_slug,
      },
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}