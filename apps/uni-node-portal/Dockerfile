FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/uni-node-portal/package.json ./apps/uni-node-portal/
# Hoist deps for Next.js standalone compatibility in Docker
RUN echo "shamefully-hoist=true" > .npmrc && \
    pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/uni-node-portal ./apps/uni-node-portal
COPY tsconfig.base.json ./
ARG NEXT_PUBLIC_API_URL=http://localhost/api/v1
ARG NEXT_PUBLIC_NODE_API_URL=http://localhost/unilink/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_NODE_API_URL=$NEXT_PUBLIC_NODE_API_URL
RUN pnpm --filter uni-node-portal build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/uni-node-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/uni-node-portal/.next/static ./apps/uni-node-portal/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/uni-node-portal/public ./apps/uni-node-portal/public
USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1
CMD ["node", "apps/uni-node-portal/server.js"]
