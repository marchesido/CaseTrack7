# ===========================================
# Stage 1: Build
# ===========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependências de build
COPY package*.json ./
RUN npm ci

# Copia o código-fonte e faz o build
COPY . .
RUN npm run build

# ===========================================
# Stage 2: Production
# ===========================================
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production



# Cria usuário não-root por segurança
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copia apenas dependências de produção
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copia o build da stage anterior
COPY --from=builder /app/dist ./dist

# Ajusta permissões
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]