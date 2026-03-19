# Usa uma imagem oficial e leve do Node.js
FROM node:20-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências primeiro (para otimizar o cache do Docker)
COPY package.json package-lock.json* ./

# Instala as dependências
RUN npm install

# Copia todo o restante do código da aplicação
COPY . .

# Gera o build de produção do Next.js e do Prisma
RUN npx prisma generate
RUN npm run build

# Expõe a porta padrão do Next.js
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "run", "start"]