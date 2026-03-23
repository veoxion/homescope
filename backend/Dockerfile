# ---- Build Stage ----
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ---- Production Stage ----
FROM node:20-alpine AS runner

RUN apk add --no-cache wget

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Prisma migrate deploy 후 서버 시작
CMD ["sh", "-c", "npx prisma migrate deploy 2>/dev/null || true && node dist/main"]
