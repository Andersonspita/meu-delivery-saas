// app/api/admin/upload/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-in-production'
)

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('admin_token')?.value
    if (!token) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    await jwtVerify(token, JWT_SECRET)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string | null // 'logo' | 'banner' | 'product'

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })

    // Valida tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Formato inválido. Use JPG, PNG ou WebP.' }, { status: 400 })
    }

    // Valida tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const folder = type === 'logo' ? 'logos' : type === 'banner' ? 'banners' : 'products'
    const filename = `${randomUUID()}.${ext}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', folder)

    // Cria pasta se não existir
    await mkdir(uploadDir, { recursive: true })

    // Salva arquivo
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(join(uploadDir, filename), buffer)

    const url = `/uploads/${folder}/${filename}`
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[UPLOAD ERROR]', err)
    return NextResponse.json({ error: 'Erro ao fazer upload.' }, { status: 500 })
  }
}