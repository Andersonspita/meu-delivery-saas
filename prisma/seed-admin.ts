// prisma/seed-admin.ts
// Execute com: npx tsx prisma/seed-admin.ts
import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'
import * as dotenv from 'dotenv'


dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const email = 'admin@pizzariasertao.com'
  const password = 'senha123'
  const pizzariaSlug = 'pizzaria-sertao'

  const pizzaria = await prisma.pizzaria.findUnique({ where: { slug: pizzariaSlug } })
  if (!pizzaria) {
    console.error(`❌ Pizzaria com slug "${pizzariaSlug}" não encontrada.`)
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { password: hash },
    create: {
      email,
      password: hash,
      pizzaria_id: pizzaria.id,
    },
  })

  console.log(`✅ Admin criado: ${admin.email}`)
  console.log(`   Senha: ${password}`)
  console.log(`   Pizzaria: ${pizzaria.name}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())