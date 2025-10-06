# Build stage
FROM node:18-alpine AS builder

ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_WS_URL

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_WS_URL

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV NEXT_PUBLIC_BACKEND_URL $NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_WS_URL $NEXT_PUBLIC_WS_URL

CMD ["node", "server.js"]
