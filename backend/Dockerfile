FROM node:22-alpine AS builder
WORKDIR /app
# openssl is required by the Prisma query engine on Alpine (musl).
RUN apk add --no-cache openssl
# Dummy URL satisfies `prisma generate` at build time — no real DB needed.
ENV DATABASE_URL="postgresql://x:x@localhost:5432/x"
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build \
    && test -f dist/main.js \
    || (echo 'ERROR: dist/main.js missing after build — check tsconfig.build.json rootDir: src' && exit 1)

FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
# Full node_modules from the builder includes the Prisma CLI (for migrate
# deploy), the generated client, and the compiled musl query engine.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
ENV PORT=3001
EXPOSE 3001
# Apply pending migrations (fatal on failure), best-effort seed, then start.
CMD ["sh", "-c", "npx prisma migrate deploy && (node prisma/seed/seed.js || echo 'seed skipped') && node dist/main.js"]
