FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/uni-node/package.json ./apps/uni-node/
# Hoist deps for Docker compatibility (pnpm symlinks don't work in multi-stage)
RUN echo "shamefully-hoist=true" > .npmrc && \
    pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY package.json pnpm-workspace.yaml ./
COPY apps/uni-node ./apps/uni-node
COPY tsconfig.base.json ./
RUN pnpm --filter @unilink/dto --filter @unilink/crypto --filter @unilink/vc-core build && \
    pnpm --filter uni-node build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/apps/uni-node/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "--experimental-require-module", "dist/src/main.js"]
