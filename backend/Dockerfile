FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN apk add --no-cache openssl
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN mkdir -p logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]