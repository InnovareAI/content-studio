# Sona (Next.js) production image, self-hosted on Hetzner behind `next start`
# via the standalone output. Mirrors SAM's self-host model.
#
# Build with the NEXT_PUBLIC_ values baked in (they are client-visible anyway):
#   docker build \
#     --build-arg NEXT_PUBLIC_SUPABASE_URL=https://supabase-content-eu.innovareai.com \
#     --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon> \
#     -t sona-web .

FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_PLATFORM_MEDIA_KEYS_ENABLED
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_PLATFORM_MEDIA_KEYS_ENABLED=$NEXT_PUBLIC_PLATFORM_MEDIA_KEYS_ENABLED \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
