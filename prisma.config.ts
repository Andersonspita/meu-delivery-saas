// prisma.config.ts — raiz do projeto
import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Usa process.env diretamente para não lançar erro em comandos
    // que não precisam do banco (ex: prisma generate em CI)
    url: process.env.DATABASE_URL ?? '',
  },
})