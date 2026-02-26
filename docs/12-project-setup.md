# 12 — Project Setup & Infrastructure

## Monorepo Structure

```
unilink/
├── CLAUDE.md
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
├── .env.example
├── .gitignore
├── .eslintrc.base.js
│
├── docker-compose.yml                ← Dev (Infrastructure only)
├── docker-compose.test.yml           ← Test (CI integration tests)
├── docker-compose.prod.yml           ← Production (Full stack)
│
├── deploy/
│   ├── docker/                       ← Docker Production configs
│   │   ├── nginx/
│   │   │   ├── registry.conf        ← Nginx config สำหรับ Registry
│   │   │   └── node.conf            ← Nginx config สำหรับ Node
│   │   ├── vault/
│   │   │   └── config.hcl           ← Vault Production config
│   │   ├── monitoring/
│   │   │   ├── prometheus.yml
│   │   │   └── grafana/
│   │   │       └── dashboards/
│   │   ├── ssl/                      ← SSL certs (gitignored)
│   │   ├── mtls/                     ← mTLS certs (gitignored)
│   │   └── secrets/                  ← Docker Secrets (gitignored)
│   │
│   ├── k8s/                          ← Kubernetes manifests
│   │   ├── base/                     ← Kustomize base
│   │   │   ├── kustomization.yaml
│   │   │   ├── namespace.yaml
│   │   │   ├── uni-registry/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   └── hpa.yaml
│   │   │   ├── uni-node/
│   │   │   │   ├── deployment.yaml
│   │   │   │   ├── service.yaml
│   │   │   │   └── hpa.yaml
│   │   │   ├── uni-node-portal/
│   │   │   │   ├── deployment.yaml
│   │   │   │   └── service.yaml
│   │   │   ├── postgres/
│   │   │   │   ├── statefulset.yaml
│   │   │   │   └── service.yaml
│   │   │   ├── redis/
│   │   │   │   ├── statefulset.yaml
│   │   │   │   └── service.yaml
│   │   │   └── vault/
│   │   │       ├── statefulset.yaml
│   │   │       └── service.yaml
│   │   ├── staging/
│   │   │   ├── kustomization.yaml
│   │   │   ├── ingress.yaml
│   │   │   └── patches/
│   │   └── production/
│   │       ├── kustomization.yaml
│   │       ├── ingress.yaml
│   │       ├── external-secrets.yaml
│   │       └── patches/
│   │
│   └── scripts/
│       ├── deploy.sh                 ← Deploy script (Docker)
│       ├── backup.sh                 ← DB Backup script
│       ├── restore.sh                ← DB Restore script
│       ├── ssl-renew.sh              ← Certbot renew
│       └── vault-init.sh             ← Vault init + key setup
│
├── apps/
│   ├── uni-registry/                 ← NestJS
│   │   ├── src/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── .env.example
│   │   └── migrations/
│   │
│   ├── uni-node/                     ← NestJS
│   │   ├── src/
│   │   ├── test/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── .env.example
│   │   └── migrations/
│   │
│   ├── uni-node-portal/              ← Next.js 15
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── hooks/
│   │   ├── public/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   └── uni-wallet/                   ← Expo (React Native)
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── store/
│       ├── lib/
│       ├── assets/
│       ├── app.json
│       ├── package.json
│       ├── tsconfig.json
│       ├── babel.config.js
│       └── .env.example
│
└── packages/
    ├── vc-core/                      ← Veramo + DID utilities
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── agent.ts
    │   │   ├── did.ts
    │   │   ├── vc.ts
    │   │   ├── vp.ts
    │   │   └── status-list.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── crypto/                       ← Ed25519 utilities
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── ed25519.ts
    │   │   ├── hash.ts
    │   │   └── vault.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    ├── dto/                          ← Shared TypeScript types
    │   ├── src/
    │   │   ├── index.ts
    │   │   ├── vc.types.ts
    │   │   ├── course.types.ts
    │   │   ├── api.types.ts
    │   │   ├── error.types.ts
    │   │   └── notification.types.ts
    │   ├── package.json
    │   └── tsconfig.json
    │
    └── ui/                           ← Shared UI components
        ├── src/
        │   ├── index.ts
        │   ├── components/
        │   └── utils/
        │       ├── thai-date.ts
        │       └── grade-color.ts
        ├── package.json
        └── tsconfig.json
```

---

## Config Files

### pnpm-workspace.yaml
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false
    },
    "lint": {
      "outputs": []
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

### tsconfig.base.json (root)
```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@unilink/dto":     ["./packages/dto/src"],
      "@unilink/crypto":  ["./packages/crypto/src"],
      "@unilink/vc-core": ["./packages/vc-core/src"],
      "@unilink/ui":      ["./packages/ui/src"]
    }
  }
}
```

### root package.json
```json
{
  "name": "unilink",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":          "turbo dev",
    "build":        "turbo build",
    "test":         "turbo test",
    "test:e2e":     "turbo test:e2e",
    "lint":         "turbo lint",
    "db:migrate":   "turbo db:migrate",
    "db:seed":      "turbo db:seed",
    "format":       "prettier --write \"**/*.{ts,tsx,json,md}\""
  },
  "devDependencies": {
    "turbo":        "latest",
    "typescript":   "^5.4.0",
    "prettier":     "^3.2.0",
    "eslint":       "^8.57.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

---

## Database Migrations

ใช้ TypeORM migrations สำหรับ NestJS apps

### Migration Naming Convention
```
YYYY-MM-DD-HHmmss-description.ts
ตัวอย่าง: 2025-01-01-120000-create-nodes-table.ts
```

### Migration Template
```typescript
// apps/uni-registry/migrations/2025-01-01-120000-create-nodes-table.ts
import { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateNodesTable20250101120000 implements MigrationInterface {
  name = 'CreateNodesTable20250101120000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE nodes (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        node_id         VARCHAR(100) UNIQUE NOT NULL,
        name            VARCHAR(200) NOT NULL,
        name_en         VARCHAR(200),
        did             VARCHAR(255) NOT NULL,
        public_key      TEXT NOT NULL,
        cert_thumbprint TEXT,
        api_endpoint    TEXT NOT NULL,
        status          VARCHAR(20) DEFAULT 'active',
        joined_at       TIMESTAMP WITH TIME ZONE DEFAULT now(),
        created_at      TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at      TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `)
    await queryRunner.query(`
      CREATE INDEX idx_nodes_status ON nodes(status)
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE nodes`)
  }
}
```

### Migration Order — uni-registry
```
001: create-nodes-table
002: create-course-aggregates-table
003: create-consent-requests-table
004: create-course-index-table
005: create-course-equivalency-table
006: create-audit-logs-table (TimescaleDB hypertable)
```

### Migration Order — uni-node
```
001: create-students-table
002: create-issued-vcs-table
003: create-credit-transfers-table
004: create-courses-table
005: create-course-offerings-table
006: create-course-outcomes-table
007: create-course-syllabus-table
008: create-course-instructors-table
009: create-course-assessments-table
```

---

## Deployment Strategy — เลือกแบบที่เหมาะ

| เงื่อนไข | Docker Compose | Kubernetes |
|---|---|---|
| มหาวิทยาลัย Pilot ≤ 10 แห่ง | ✅ เหมาะ | ใหญ่เกินจำเป็น |
| มหาวิทยาลัย > 20 แห่ง | ไม่แนะนำ | ✅ เหมาะ |
| ทีม DevOps 1-3 คน | ✅ เหมาะ | ต้อง K8s skill |
| ต้องการ Auto-scaling | ❌ ไม่รองรับ | ✅ HPA |
| Server 1-2 เครื่อง | ✅ เหมาะ | ไม่จำเป็น |
| Multi-server cluster | ❌ จำกัด | ✅ เหมาะ |
| Budget จำกัด | ✅ ถูกกว่า | แพงกว่า (Managed K8s) |

> **แนะนำ:** เริ่มด้วย Docker Compose Production → ย้าย Kubernetes เมื่อต้อง scale

---

## Dockerfiles

### apps/uni-registry/Dockerfile
```dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/uni-registry/package.json ./apps/uni-registry/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/uni-registry ./apps/uni-registry
COPY tsconfig.base.json ./
RUN pnpm --filter uni-registry build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/apps/uni-registry/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### apps/uni-node/Dockerfile
```dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/uni-node/package.json ./apps/uni-node/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/uni-node ./apps/uni-node
COPY tsconfig.base.json ./
RUN pnpm --filter uni-node build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs
COPY --from=builder --chown=nestjs:nodejs /app/apps/uni-node/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
USER nestjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/main.js"]
```

### apps/uni-node-portal/Dockerfile
```dockerfile
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/uni-node-portal/package.json ./apps/uni-node-portal/
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY apps/uni-node-portal ./apps/uni-node-portal
COPY tsconfig.base.json ./
RUN pnpm --filter uni-node-portal build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/uni-node-portal/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/uni-node-portal/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/uni-node-portal/public ./public
USER nextjs
EXPOSE 3000
ENV HOSTNAME="0.0.0.0"
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=20s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
CMD ["node", "server.js"]
```

### .dockerignore (ทุก app ใช้ร่วมกัน)
```
node_modules
.next
dist
.git
*.md
.env
.env.*
!.env.example
coverage
.turbo
```

---

## 1. Docker Compose — Development

ใช้สำหรับ Local Development — รัน **Infrastructure เท่านั้น** (App รันด้วย `pnpm dev`)

### docker-compose.yml
```yaml
version: '3.9'

services:
  # ── Databases ────────────────────────────────────────
  postgres-registry:
    image: timescale/timescaledb:latest-pg16
    container_name: unilink-pg-registry
    environment:
      POSTGRES_USER: uniregistry
      POSTGRES_PASSWORD: password
      POSTGRES_DB: uniregistry
    ports:
      - "5432:5432"
    volumes:
      - pg-registry-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uniregistry"]
      interval: 10s
      timeout: 5s
      retries: 5

  postgres-node:
    image: timescale/timescaledb:latest-pg16
    container_name: unilink-pg-node
    environment:
      POSTGRES_USER: uninode
      POSTGRES_PASSWORD: password
      POSTGRES_DB: uninode_tu
    ports:
      - "5433:5432"
    volumes:
      - pg-node-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uninode"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: unilink-redis
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # ── HashiCorp Vault (Dev mode) ────────────────────────
  vault:
    image: hashicorp/vault:1.17
    container_name: unilink-vault
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: dev-root-token
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    ports:
      - "8200:8200"
    cap_add:
      - IPC_LOCK

  # ── Authentik ─────────────────────────────────────────
  authentik-db:
    image: postgres:16-alpine
    container_name: unilink-authentik-db
    environment:
      POSTGRES_USER: authentik
      POSTGRES_PASSWORD: authentik-password
      POSTGRES_DB: authentik
    volumes:
      - authentik-db-data:/var/lib/postgresql/data

  authentik-redis:
    image: redis:alpine
    container_name: unilink-authentik-redis

  authentik-server:
    image: ghcr.io/goauthentik/server:2024.8
    container_name: unilink-authentik
    command: server
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentik-password
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_SECRET_KEY: dev-secret-key-change-in-prod
      AUTHENTIK_ERROR_REPORTING__ENABLED: "false"
    ports:
      - "9000:9000"
      - "9443:9443"
    depends_on:
      - authentik-db
      - authentik-redis

  authentik-worker:
    image: ghcr.io/goauthentik/server:2024.8
    container_name: unilink-authentik-worker
    command: worker
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__PASSWORD: authentik-password
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_SECRET_KEY: dev-secret-key-change-in-prod
    depends_on:
      - authentik-db
      - authentik-redis

volumes:
  pg-registry-data:
  pg-node-data:
  redis-data:
  authentik-db-data:
```

### Dev Quick Start
```bash
# 1. Setup Monorepo
git clone <repo-url> unilink
cd unilink
corepack enable
pnpm install

# 2. Copy ENV files
cp apps/uni-registry/.env.example apps/uni-registry/.env
cp apps/uni-node/.env.example apps/uni-node/.env
cp apps/uni-node-portal/.env.example apps/uni-node-portal/.env
cp apps/uni-wallet/.env.example apps/uni-wallet/.env

# 3. Start Infrastructure
docker compose up -d
# รอ 30 วิ ให้ Services พร้อม

# 4. Init Vault (Dev)
export VAULT_ADDR=http://localhost:8200
export VAULT_TOKEN=dev-root-token
vault secrets enable transit
vault secrets enable -version=2 -path=secret kv
vault write transit/keys/tu-ac-th type=ed25519
vault write transit/keys/chula-ac-th type=ed25519

# 5. Run Migrations
pnpm db:migrate

# 6. Seed Dev Data
pnpm db:seed

# 7. Start Dev (Hot Reload)
pnpm dev
```

---

## 2. Docker Compose — Production

ใช้สำหรับ Production บน Server เดี่ยว — รัน **ทุกอย่างใน Docker**

### Architecture: UniRegistry Server

```
Server: registry.unilink.ac.th
Spec แนะนำ: 4 vCPU / 16 GB RAM / 200 GB SSD

                    ┌───── Port 80/443 ─────┐
                    ▼                        │
              ┌──────────┐                   │
Internet ────►│  nginx   │──► uni-registry (:3000)
              │  :80/443 │──► authentik      (:9000)
              └──────────┘
                    │
          ┌────────┼────────┐
          ▼        ▼        ▼
      postgres   redis    vault
      (:5432)    (:6379)  (:8200)
        │
      backup (cron)
```

### Architecture: UniLink Node Server

```
Server: node.tu.ac.th
Spec แนะนำ: 2 vCPU / 8 GB RAM / 100 GB SSD

                    ┌───── Port 80/443 ─────┐
                    ▼                        │
              ┌──────────┐                   │
Internet ────►│  nginx   │──► uni-node         (:3000)
              │  :80/443 │──► uni-node-portal  (:3001)
              └──────────┘
                    │
          ┌────────┼────────┐
          ▼        ▼        ▼
      postgres   redis    vault
      (:5432)    (:6379)  (:8200)
```

### docker-compose.prod.yml (Registry Server)
```yaml
version: '3.9'

services:
  # ══════════════════════════════════════════
  #  APP CONTAINERS
  # ══════════════════════════════════════════
  uni-registry:
    image: ghcr.io/unilink/uni-registry:${VERSION:-latest}
    container_name: unilink-registry
    restart: always
    expose:
      - "3000"
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      vault:
        condition: service_started
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    networks:
      - app-net
      - db-net

  # ══════════════════════════════════════════
  #  REVERSE PROXY
  # ══════════════════════════════════════════
  nginx:
    image: nginx:alpine
    container_name: unilink-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/docker/nginx/registry.conf:/etc/nginx/conf.d/default.conf:ro
      - ./deploy/docker/ssl:/etc/nginx/ssl:ro
      - ./deploy/docker/mtls:/etc/nginx/mtls:ro
    depends_on:
      - uni-registry
      - authentik-server
    networks:
      - app-net

  # ══════════════════════════════════════════
  #  DATABASE
  # ══════════════════════════════════════════
  postgres:
    image: timescale/timescaledb:latest-pg16
    container_name: unilink-pg
    restart: always
    environment:
      POSTGRES_USER_FILE: /run/secrets/db_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: uniregistry
    volumes:
      - pg-data:/var/lib/postgresql/data
      - ./deploy/docker/backup:/backup
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
    secrets:
      - db_user
      - db_password
    networks:
      - db-net

  # ══════════════════════════════════════════
  #  REDIS
  # ══════════════════════════════════════════
  redis:
    image: redis:7-alpine
    container_name: unilink-redis
    restart: always
    command: >
      redis-server
      --appendonly yes
      --requirepass ${REDIS_PASSWORD:-changeme}
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD:-changeme}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 1G
    networks:
      - db-net

  # ══════════════════════════════════════════
  #  VAULT (Production Mode)
  # ══════════════════════════════════════════
  vault:
    image: hashicorp/vault:1.17
    container_name: unilink-vault
    restart: always
    volumes:
      - ./deploy/docker/vault/config.hcl:/vault/config/config.hcl:ro
      - vault-data:/vault/data
    cap_add:
      - IPC_LOCK
    command: vault server -config=/vault/config/config.hcl
    deploy:
      resources:
        limits:
          memory: 1G
    networks:
      - db-net

  # ══════════════════════════════════════════
  #  AUTHENTIK
  # ══════════════════════════════════════════
  authentik-server:
    image: ghcr.io/goauthentik/server:2024.8
    container_name: unilink-authentik
    restart: always
    command: server
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_SECRET_KEY_FILE: /run/secrets/authentik_secret
      AUTHENTIK_POSTGRESQL__PASSWORD_FILE: /run/secrets/authentik_db_password
      AUTHENTIK_ERROR_REPORTING__ENABLED: "false"
    expose:
      - "9000"
    depends_on:
      - authentik-db
      - authentik-redis
    secrets:
      - authentik_secret
      - authentik_db_password
    networks:
      - app-net
      - db-net

  authentik-worker:
    image: ghcr.io/goauthentik/server:2024.8
    container_name: unilink-authentik-worker
    restart: always
    command: worker
    environment:
      AUTHENTIK_REDIS__HOST: authentik-redis
      AUTHENTIK_POSTGRESQL__HOST: authentik-db
      AUTHENTIK_POSTGRESQL__USER: authentik
      AUTHENTIK_POSTGRESQL__NAME: authentik
      AUTHENTIK_SECRET_KEY_FILE: /run/secrets/authentik_secret
      AUTHENTIK_POSTGRESQL__PASSWORD_FILE: /run/secrets/authentik_db_password
    depends_on:
      - authentik-db
      - authentik-redis
    secrets:
      - authentik_secret
      - authentik_db_password
    networks:
      - db-net

  authentik-db:
    image: postgres:16-alpine
    container_name: unilink-authentik-db
    restart: always
    environment:
      POSTGRES_USER: authentik
      POSTGRES_PASSWORD_FILE: /run/secrets/authentik_db_password
      POSTGRES_DB: authentik
    volumes:
      - authentik-db-data:/var/lib/postgresql/data
    networks:
      - db-net

  authentik-redis:
    image: redis:alpine
    container_name: unilink-authentik-redis
    restart: always
    networks:
      - db-net

  # ══════════════════════════════════════════
  #  MONITORING (Optional แต่แนะนำ)
  # ══════════════════════════════════════════
  prometheus:
    image: prom/prometheus:latest
    container_name: unilink-prometheus
    restart: always
    volumes:
      - ./deploy/docker/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus-data:/prometheus
    networks:
      - app-net

  grafana:
    image: grafana/grafana:latest
    container_name: unilink-grafana
    restart: always
    environment:
      GF_SECURITY_ADMIN_PASSWORD_FILE: /run/secrets/grafana_password
    ports:
      - "3100:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./deploy/docker/monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards:ro
    secrets:
      - grafana_password
    networks:
      - app-net

  loki:
    image: grafana/loki:latest
    container_name: unilink-loki
    restart: always
    volumes:
      - loki-data:/loki
    networks:
      - app-net

# ══════════════════════════════════════════
#  SECRETS
# ══════════════════════════════════════════
secrets:
  db_user:
    file: ./deploy/docker/secrets/db_user.txt
  db_password:
    file: ./deploy/docker/secrets/db_password.txt
  authentik_secret:
    file: ./deploy/docker/secrets/authentik_secret.txt
  authentik_db_password:
    file: ./deploy/docker/secrets/authentik_db_password.txt
  grafana_password:
    file: ./deploy/docker/secrets/grafana_password.txt

# ══════════════════════════════════════════
#  VOLUMES & NETWORKS
# ══════════════════════════════════════════
volumes:
  pg-data:
  redis-data:
  vault-data:
  authentik-db-data:
  prometheus-data:
  grafana-data:
  loki-data:

networks:
  app-net:
    driver: bridge
  db-net:
    driver: bridge
    internal: true
```

### docker-compose.prod.node.yml (Node Server — แต่ละมหาวิทยาลัย)
```yaml
version: '3.9'

services:
  uni-node:
    image: ghcr.io/unilink/uni-node:${VERSION:-latest}
    container_name: unilink-node
    restart: always
    expose:
      - "3000"
    env_file:
      - .env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      vault:
        condition: service_started
    deploy:
      resources:
        limits:
          cpus: '1.5'
          memory: 1G
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    networks:
      - app-net
      - db-net

  uni-node-portal:
    image: ghcr.io/unilink/uni-node-portal:${VERSION:-latest}
    container_name: unilink-portal
    restart: always
    expose:
      - "3000"
    env_file:
      - .env.portal.production
    depends_on:
      - uni-node
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "3"
    networks:
      - app-net

  nginx:
    image: nginx:alpine
    container_name: unilink-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./deploy/docker/nginx/node.conf:/etc/nginx/conf.d/default.conf:ro
      - ./deploy/docker/ssl:/etc/nginx/ssl:ro
    depends_on:
      - uni-node
      - uni-node-portal
    networks:
      - app-net

  postgres:
    image: timescale/timescaledb:latest-pg16
    container_name: unilink-pg
    restart: always
    environment:
      POSTGRES_USER_FILE: /run/secrets/db_user
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      POSTGRES_DB: uninode
    volumes:
      - pg-data:/var/lib/postgresql/data
      - ./deploy/docker/backup:/backup
    healthcheck:
      test: ["CMD-SHELL", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G
    secrets:
      - db_user
      - db_password
    networks:
      - db-net

  redis:
    image: redis:7-alpine
    container_name: unilink-redis
    restart: always
    command: >
      redis-server
      --appendonly yes
      --requirepass ${REDIS_PASSWORD:-changeme}
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--no-auth-warning", "-a", "${REDIS_PASSWORD:-changeme}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - db-net

  vault:
    image: hashicorp/vault:1.17
    container_name: unilink-vault
    restart: always
    volumes:
      - ./deploy/docker/vault/config.hcl:/vault/config/config.hcl:ro
      - vault-data:/vault/data
    cap_add:
      - IPC_LOCK
    command: vault server -config=/vault/config/config.hcl
    networks:
      - db-net

secrets:
  db_user:
    file: ./deploy/docker/secrets/db_user.txt
  db_password:
    file: ./deploy/docker/secrets/db_password.txt

volumes:
  pg-data:
  redis-data:
  vault-data:

networks:
  app-net:
    driver: bridge
  db-net:
    driver: bridge
    internal: true
```

### Nginx Config — Registry (deploy/docker/nginx/registry.conf)
```nginx
upstream registry_api {
    server uni-registry:3000;
}
upstream authentik_server {
    server authentik-server:9000;
}

server {
    listen 80;
    server_name registry.unilink.ac.th;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name registry.unilink.ac.th;

    ssl_certificate     /etc/nginx/ssl/registry.crt;
    ssl_certificate_key /etc/nginx/ssl/registry.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # mTLS — ขอ Client Certificate (สำหรับ Node)
    ssl_client_certificate /etc/nginx/mtls/ca.crt;
    ssl_verify_client      optional;

    # UniLink API
    location /api/v1/ {
        proxy_pass http://registry_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-SSL-Client-Cert $ssl_client_cert;
        proxy_set_header X-SSL-Client-Verify $ssl_client_verify;
    }

    # Authentik SSO
    location /auth/ {
        proxy_pass http://authentik_server;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Check (internal)
    location /health {
        proxy_pass http://registry_api/health;
        access_log off;
    }
}
```

### Nginx Config — Node (deploy/docker/nginx/node.conf)
```nginx
upstream node_api {
    server uni-node:3000;
}
upstream node_portal {
    server uni-node-portal:3000;
}

server {
    listen 80;
    server_name tu.ac.th node-portal.tu.ac.th;
    return 301 https://$host$request_uri;
}

# UniLink Node API
server {
    listen 443 ssl;
    server_name tu.ac.th;

    ssl_certificate     /etc/nginx/ssl/node.crt;
    ssl_certificate_key /etc/nginx/ssl/node.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # did:web (Public)
    location /.well-known/did.json {
        proxy_pass http://node_api/.well-known/did.json;
        add_header Access-Control-Allow-Origin "*";
        add_header Cache-Control "public, max-age=3600";
    }

    location /.well-known/status-list/ {
        proxy_pass http://node_api/.well-known/status-list/;
        add_header Access-Control-Allow-Origin "*";
        add_header Cache-Control "public, max-age=300";
    }

    # UniLink API
    location /unilink/ {
        proxy_pass http://node_api/unilink/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Admin Portal (อาจจำกัด IP / VPN)
server {
    listen 443 ssl;
    server_name node-portal.tu.ac.th;

    ssl_certificate     /etc/nginx/ssl/node.crt;
    ssl_certificate_key /etc/nginx/ssl/node.key;

    # จำกัดเฉพาะ Internal Network (ตัวอย่าง)
    # allow 10.0.0.0/8;
    # deny all;

    location / {
        proxy_pass http://node_portal;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Vault Production Config (deploy/docker/vault/config.hcl)
```hcl
storage "file" {
  path = "/vault/data"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = 1    # TLS terminated at nginx
}

api_addr = "http://0.0.0.0:8200"

disable_mlock = false
ui            = false

telemetry {
  prometheus_retention_time = "30s"
  disable_hostname          = true
}
```

### Production Deploy Commands
```bash
# ===== Registry Server =====

# 1. สร้าง Secrets
mkdir -p deploy/docker/secrets
echo "uniregistry" > deploy/docker/secrets/db_user.txt
openssl rand -base64 32 > deploy/docker/secrets/db_password.txt
openssl rand -base64 64 > deploy/docker/secrets/authentik_secret.txt
openssl rand -base64 32 > deploy/docker/secrets/authentik_db_password.txt
openssl rand -base64 32 > deploy/docker/secrets/grafana_password.txt
chmod 600 deploy/docker/secrets/*.txt

# 2. วาง SSL Certificates
cp /path/to/registry.crt deploy/docker/ssl/registry.crt
cp /path/to/registry.key deploy/docker/ssl/registry.key
cp /path/to/ca.crt deploy/docker/mtls/ca.crt

# 3. Start
VERSION=v1.0.0 docker compose -f docker-compose.prod.yml up -d

# 4. Init Vault (ครั้งแรกเท่านั้น)
bash deploy/scripts/vault-init.sh

# 5. Run Migrations
docker compose -f docker-compose.prod.yml exec uni-registry \
  node dist/data-source.js migration:run

# ===== Node Server =====

# ทำเหมือนกัน แต่ใช้ docker-compose.prod.node.yml
VERSION=v1.0.0 docker compose -f docker-compose.prod.node.yml up -d
```

### Deploy Script (deploy/scripts/deploy.sh)
```bash
#!/bin/bash
set -euo pipefail

# Usage: ./deploy.sh <compose-file> <service> <version>
# Example: ./deploy.sh docker-compose.prod.yml uni-registry v1.2.0

COMPOSE_FILE=${1:?"Usage: deploy.sh <compose-file> <service> <version>"}
SERVICE=${2:?"Specify service name"}
VERSION=${3:?"Specify version tag"}

echo "=== Deploying ${SERVICE}:${VERSION} ==="

# 1. Pull new image
echo "[1/4] Pulling image..."
VERSION=${VERSION} docker compose -f ${COMPOSE_FILE} pull ${SERVICE}

# 2. Recreate container (only the specified service)
echo "[2/4] Recreating container..."
VERSION=${VERSION} docker compose -f ${COMPOSE_FILE} up -d --no-deps ${SERVICE}

# 3. Wait for health check
echo "[3/4] Waiting for health check..."
ATTEMPTS=0
MAX_ATTEMPTS=30
until [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; do
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' unilink-${SERVICE} 2>/dev/null || echo "unknown")
    if [ "$HEALTH" = "healthy" ]; then
        echo "Health check passed!"
        break
    fi
    ATTEMPTS=$((ATTEMPTS + 1))
    echo "  Waiting... (${ATTEMPTS}/${MAX_ATTEMPTS}) status=${HEALTH}"
    sleep 5
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
    echo "ERROR: Health check failed after ${MAX_ATTEMPTS} attempts"
    echo "Rolling back..."
    VERSION=latest docker compose -f ${COMPOSE_FILE} up -d --no-deps ${SERVICE}
    exit 1
fi

# 4. Cleanup
echo "[4/4] Cleaning up old images..."
docker image prune -f

echo "=== ${SERVICE}:${VERSION} deployed successfully ==="
```

### Backup Script (deploy/scripts/backup.sh)
```bash
#!/bin/bash
set -euo pipefail

# Usage: crontab -e → 0 3 * * * /path/to/backup.sh

BACKUP_DIR="/backup"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo "=== Starting backup at ${DATE} ==="

# Backup PostgreSQL
docker exec unilink-pg pg_dumpall -U "$(cat deploy/docker/secrets/db_user.txt)" \
  | gzip > "${BACKUP_DIR}/pg_${DATE}.sql.gz"

echo "DB backup: ${BACKUP_DIR}/pg_${DATE}.sql.gz"

# Backup Vault (snapshot)
docker exec unilink-vault vault operator raft snapshot save /vault/data/snapshot_${DATE}.snap 2>/dev/null || true

# Remove old backups
find ${BACKUP_DIR} -name "pg_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "=== Backup completed ==="
```

### Docker Compose Production — Comparison with Dev

| หัวข้อ | Dev (docker-compose.yml) | Production (docker-compose.prod.yml) |
|---|---|---|
| App containers | ❌ ไม่มี (ใช้ pnpm dev) | ✅ ทุก app อยู่ใน Docker |
| restart policy | ไม่มี | `restart: always` |
| Secrets | .env plain text | Docker Secrets (file-based) |
| Vault mode | Dev (in-memory) | Production (encrypted file storage) |
| Network | 1 network (default) | 2 networks (app-net + db-net internal) |
| Ports exposed | ทุก port (debug) | เฉพาะ nginx 80/443 |
| Resource limits | ไม่จำกัด | `deploy.resources.limits` |
| Health checks | บาง container | ทุก container |
| Logging | stdout | json-file + rotation |
| SSL | ไม่มี | nginx terminate SSL + mTLS |
| Monitoring | ไม่มี | Prometheus + Grafana + Loki |
| Backup | ไม่มี | cron + pg_dump script |

---

## 3. Kubernetes — Scaling Production

ใช้เมื่อต้องการ Auto-scaling, Multi-node cluster, Rolling updates

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Kubernetes Cluster                                     │
│                                                         │
│  namespace: unilink                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Deployments                                      │  │
│  │  ┌─────────────┐ ┌─────────┐ ┌──────────────┐    │  │
│  │  │ uni-registry│ │ uni-node│ │uni-node-portal│    │  │
│  │  │ replicas: 2 │ │ rep.: 3 │ │ replicas: 1  │    │  │
│  │  └──────┬──────┘ └────┬────┘ └──────┬───────┘    │  │
│  │         └──────┬──────┴─────────────┘             │  │
│  │                ▼                                   │  │
│  │  ┌──────────────────────────────────────────┐     │  │
│  │  │ Services (ClusterIP)                     │     │  │
│  │  └──────────────────┬───────────────────────┘     │  │
│  │                     ▼                              │  │
│  │  ┌──────────────────────────────────────────┐     │  │
│  │  │ Ingress (nginx-ingress + cert-manager)   │     │  │
│  │  └──────────────────────────────────────────┘     │  │
│  │                                                    │  │
│  │  StatefulSets                                     │  │
│  │  ┌──────────┐ ┌────────┐ ┌────────────────┐      │  │
│  │  │ postgres │ │ redis  │ │ vault          │      │  │
│  │  │ (PVC)    │ │ (PVC)  │ │ (PVC)          │      │  │
│  │  └──────────┘ └────────┘ └────────────────┘      │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  namespace: unilink-monitoring                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Prometheus │ Grafana │ Loki                      │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Namespace (deploy/k8s/base/namespace.yaml)
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: unilink
  labels:
    app.kubernetes.io/part-of: unilink
```

### uni-registry Deployment (deploy/k8s/base/uni-registry/deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uni-registry
  namespace: unilink
  labels:
    app: uni-registry
spec:
  replicas: 2
  selector:
    matchLabels:
      app: uni-registry
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: uni-registry
    spec:
      serviceAccountName: uni-registry
      containers:
        - name: uni-registry
          image: ghcr.io/unilink/uni-registry:latest
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - secretRef:
                name: uni-registry-secrets
            - configMapRef:
                name: uni-registry-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 12
```

### uni-registry Service (deploy/k8s/base/uni-registry/service.yaml)
```yaml
apiVersion: v1
kind: Service
metadata:
  name: uni-registry
  namespace: unilink
spec:
  selector:
    app: uni-registry
  ports:
    - port: 80
      targetPort: 3000
      name: http
```

### uni-registry HPA (deploy/k8s/base/uni-registry/hpa.yaml)
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: uni-registry
  namespace: unilink
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: uni-registry
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### uni-node Deployment (deploy/k8s/base/uni-node/deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uni-node
  namespace: unilink
  labels:
    app: uni-node
spec:
  replicas: 2
  selector:
    matchLabels:
      app: uni-node
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: uni-node
    spec:
      containers:
        - name: uni-node
          image: ghcr.io/unilink/uni-node:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: uni-node-secrets
            - configMapRef:
                name: uni-node-config
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "1Gi"
              cpu: "1000m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### uni-node-portal Deployment (deploy/k8s/base/uni-node-portal/deployment.yaml)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: uni-node-portal
  namespace: unilink
  labels:
    app: uni-node-portal
spec:
  replicas: 1
  selector:
    matchLabels:
      app: uni-node-portal
  template:
    metadata:
      labels:
        app: uni-node-portal
    spec:
      containers:
        - name: uni-node-portal
          image: ghcr.io/unilink/uni-node-portal:latest
          ports:
            - containerPort: 3000
          envFrom:
            - secretRef:
                name: uni-node-portal-secrets
            - configMapRef:
                name: uni-node-portal-config
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /
              port: 3000
            initialDelaySeconds: 20
            periodSeconds: 10
```

### Production Ingress (deploy/k8s/production/ingress.yaml)
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: unilink-ingress
  namespace: unilink
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - registry.unilink.ac.th
      secretName: uni-registry-tls
    - hosts:
        - tu.ac.th
        - node-portal.tu.ac.th
      secretName: uni-node-tu-tls
  rules:
    # Registry API
    - host: registry.unilink.ac.th
      http:
        paths:
          - path: /api/
            pathType: Prefix
            backend:
              service:
                name: uni-registry
                port:
                  number: 80
    # Node API + did.json
    - host: tu.ac.th
      http:
        paths:
          - path: /unilink/
            pathType: Prefix
            backend:
              service:
                name: uni-node
                port:
                  number: 80
          - path: /.well-known/
            pathType: Prefix
            backend:
              service:
                name: uni-node
                port:
                  number: 80
    # Admin Portal
    - host: node-portal.tu.ac.th
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: uni-node-portal
                port:
                  number: 80
```

### External Secrets (deploy/k8s/production/external-secrets.yaml)
```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: uni-registry-secrets
  namespace: unilink
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: uni-registry-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: secret/unilink/registry
        property: database_url
    - secretKey: JWT_SECRET
      remoteRef:
        key: secret/unilink/registry
        property: jwt_secret
    - secretKey: REDIS_PASSWORD
      remoteRef:
        key: secret/unilink/registry
        property: redis_password
    - secretKey: AUTHENTIK_CLIENT_SECRET
      remoteRef:
        key: secret/unilink/registry
        property: authentik_client_secret
```

### Kustomize Base (deploy/k8s/base/kustomization.yaml)
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - namespace.yaml
  - uni-registry/deployment.yaml
  - uni-registry/service.yaml
  - uni-registry/hpa.yaml
  - uni-node/deployment.yaml
  - uni-node/service.yaml
  - uni-node/hpa.yaml
  - uni-node-portal/deployment.yaml
  - uni-node-portal/service.yaml

commonLabels:
  app.kubernetes.io/part-of: unilink
```

### Kustomize Production (deploy/k8s/production/kustomization.yaml)
```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
  - ../base

resources:
  - ingress.yaml
  - external-secrets.yaml

patches:
  - path: patches/registry-replicas.yaml
  - path: patches/node-replicas.yaml

images:
  - name: ghcr.io/unilink/uni-registry
    newTag: v1.0.0
  - name: ghcr.io/unilink/uni-node
    newTag: v1.0.0
  - name: ghcr.io/unilink/uni-node-portal
    newTag: v1.0.0
```

### K8s Deploy Commands
```bash
# Staging
kubectl apply -k deploy/k8s/staging/

# Production
kubectl apply -k deploy/k8s/production/

# Update image version
cd deploy/k8s/production
kustomize edit set image ghcr.io/unilink/uni-registry:v1.2.0
kubectl apply -k .

# Scale manually
kubectl scale deployment uni-node --replicas=4 -n unilink

# Check status
kubectl get pods -n unilink
kubectl get hpa -n unilink
kubectl logs -f deployment/uni-registry -n unilink
```

---

## 4. Docker Compose — Test (CI)

### docker-compose.test.yml
```yaml
version: '3.9'

services:
  postgres-test:
    image: timescale/timescaledb:latest-pg16
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: test
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 3s
      retries: 5
    tmpfs:
      - /var/lib/postgresql/data

  redis-test:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  vault-test:
    image: hashicorp/vault:1.17
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: test-token
      VAULT_DEV_LISTEN_ADDRESS: 0.0.0.0:8200
    ports:
      - "8200:8200"
    cap_add:
      - IPC_LOCK
```

---

## CI/CD Pipeline

### .github/workflows/ci.yml
```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  PNPM_VERSION: 9.0.0

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm tsc --noEmit

  unit-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  integration-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: ['5432:5432']
        options: --health-cmd pg_isready --health-interval 10s --health-timeout 5s --health-retries 5
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: ${{ env.PNPM_VERSION }} }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: ${{ env.PNPM_VERSION }} }
      - run: pnpm install --frozen-lockfile
      - run: pnpm audit --audit-level=high
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
```

### .github/workflows/deploy.yml
```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
    tags: ['v*']
  workflow_dispatch:
    inputs:
      app:
        description: 'App to deploy'
        required: true
        type: choice
        options: [uni-registry, uni-node, uni-node-portal, all]
      target:
        description: 'Deploy target'
        required: true
        type: choice
        options: [staging, production]

env:
  REGISTRY: ghcr.io
  REGISTRY_PATH: ghcr.io/unilink

jobs:
  # ── Build Docker Images ─────────────────────
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [uni-registry, uni-node, uni-node-portal]
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Docker meta
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY_PATH }}/${{ matrix.app }}
          tags: |
            type=sha
            type=ref,event=tag
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          file: apps/${{ matrix.app }}/Dockerfile
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ── Deploy to Docker Compose (Staging) ──────
  deploy-docker-staging:
    if: github.event.inputs.target == 'staging' || github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/unilink
            git pull origin main
            VERSION=${{ github.sha }} docker compose -f docker-compose.prod.yml pull
            VERSION=${{ github.sha }} docker compose -f docker-compose.prod.yml up -d
            docker image prune -f

  # ── Deploy to Kubernetes (Production) ───────
  deploy-k8s-production:
    if: github.event.inputs.target == 'production' || startsWith(github.ref, 'refs/tags/v')
    needs: build
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Set up kubectl
        uses: azure/setup-kubectl@v4

      - name: Configure kubeconfig
        run: echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > $HOME/.kube/config

      - name: Update image tags
        run: |
          cd deploy/k8s/production
          kustomize edit set image \
            ghcr.io/unilink/uni-registry:${{ github.sha }} \
            ghcr.io/unilink/uni-node:${{ github.sha }} \
            ghcr.io/unilink/uni-node-portal:${{ github.sha }}

      - name: Apply manifests
        run: kubectl apply -k deploy/k8s/production/

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/uni-registry -n unilink --timeout=300s
          kubectl rollout status deployment/uni-node -n unilink --timeout=300s
```

---

## Health Check Endpoints

ทุก NestJS app ต้องมี:

```
GET /health           ← Liveness: App ทำงานอยู่ไหม
GET /health/ready     ← Readiness: พร้อมรับ Traffic ไหม (DB, Redis connected)
```

```typescript
// apps/uni-registry/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common'
import {
  HealthCheck, HealthCheckService,
  TypeOrmHealthIndicator, MemoryHealthIndicator
} from '@nestjs/terminus'

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  liveness() {
    return this.health.check([
      () => this.memory.checkHeap('memory_heap', 200 * 1024 * 1024),
    ])
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('database'),
    ])
  }
}
```

---

## Port Mapping Reference

### Development
| Service | Host Port | Container Port |
|---|---|---|
| postgres-registry | 5432 | 5432 |
| postgres-node | 5433 | 5432 |
| redis | 6379 | 6379 |
| vault | 8200 | 8200 |
| authentik | 9000 | 9000 |
| uni-registry (pnpm dev) | 3000 | — |
| uni-node (pnpm dev) | 3010 | — |
| uni-node-portal (pnpm dev) | 3011 | — |

### Production (Docker Compose)
| Service | Host Port | Container Port | Note |
|---|---|---|---|
| nginx | 80, 443 | 80, 443 | เฉพาะ nginx expose |
| uni-registry | (internal) | 3000 | ผ่าน nginx เท่านั้น |
| uni-node | (internal) | 3000 | ผ่าน nginx เท่านั้น |
| uni-node-portal | (internal) | 3000 | ผ่าน nginx เท่านั้น |
| postgres | (internal) | 5432 | db-net (internal) |
| redis | (internal) | 6379 | db-net (internal) |
| vault | (internal) | 8200 | db-net (internal) |
| grafana | 3100 | 3000 | Monitoring UI |

### Production (Kubernetes)
| Service | Type | Port |
|---|---|---|
| Ingress (nginx) | LoadBalancer | 80, 443 |
| uni-registry | ClusterIP | 80 → 3000 |
| uni-node | ClusterIP | 80 → 3000 |
| uni-node-portal | ClusterIP | 80 → 3000 |
| postgres | ClusterIP | 5432 |
| redis | ClusterIP | 6379 |
| vault | ClusterIP | 8200 |
