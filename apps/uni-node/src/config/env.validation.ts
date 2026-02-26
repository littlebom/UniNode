import { Logger } from '@nestjs/common'

const logger = new Logger('EnvValidation')

interface ValidatedEnv {
  DATABASE_URL: string
  REDIS_URL: string
  JWT_SECRET: string
  VAULT_URL: string
  VAULT_TOKEN: string
  VAULT_SIGNING_KEY_PATH: string
  NODE_ID: string
  NODE_DOMAIN: string
  PORT: number
  NODE_ENV: string
  [key: string]: unknown
}

export function validateEnv(
  config: Record<string, unknown>,
): ValidatedEnv {
  const errors: string[] = []

  // ── Required Variables ──
  const requiredVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'VAULT_URL',
    'VAULT_TOKEN',
    'VAULT_SIGNING_KEY_PATH',
    'NODE_ID',
    'NODE_DOMAIN',
  ]
  for (const key of requiredVars) {
    if (!config[key] || String(config[key]).trim() === '') {
      errors.push(`${key} is required`)
    }
  }

  // ── JWT_SECRET min length ──
  const jwtSecret = String(config['JWT_SECRET'] ?? '')
  if (jwtSecret && jwtSecret.length < 64) {
    errors.push(
      `JWT_SECRET must be at least 64 characters (got ${jwtSecret.length})`,
    )
  }

  // ── DATABASE_URL format ──
  const dbUrl = String(config['DATABASE_URL'] ?? '')
  if (dbUrl && !dbUrl.startsWith('postgresql://') && !dbUrl.startsWith('postgres://')) {
    errors.push(
      'DATABASE_URL must start with postgresql:// or postgres://',
    )
  }

  // ── VAULT_URL format ──
  const vaultUrl = String(config['VAULT_URL'] ?? '')
  if (vaultUrl && !vaultUrl.startsWith('http://') && !vaultUrl.startsWith('https://')) {
    errors.push(
      'VAULT_URL must start with http:// or https://',
    )
  }

  // ── PORT range ──
  const port = config['PORT'] ? Number(config['PORT']) : 3010
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push(`PORT must be between 1 and 65535 (got ${config['PORT']})`)
  }

  // ── NODE_ENV ──
  const nodeEnv = String(config['NODE_ENV'] ?? 'development')
  const validEnvs = ['development', 'production', 'test']
  if (!validEnvs.includes(nodeEnv)) {
    errors.push(
      `NODE_ENV must be one of: ${validEnvs.join(', ')} (got ${nodeEnv})`,
    )
  }

  // ── SIS_WEBHOOK_SECRET (optional, min 32 chars if provided) ──
  const sisSecret = config['SIS_WEBHOOK_SECRET']
    ? String(config['SIS_WEBHOOK_SECRET'])
    : undefined
  if (sisSecret && sisSecret.length < 32) {
    errors.push(
      `SIS_WEBHOOK_SECRET must be at least 32 characters if provided (got ${sisSecret.length})`,
    )
  }

  // ── REGISTRY_URL format (optional) ──
  const registryUrl = config['REGISTRY_URL']
    ? String(config['REGISTRY_URL'])
    : undefined
  if (
    registryUrl &&
    !registryUrl.startsWith('http://') &&
    !registryUrl.startsWith('https://')
  ) {
    errors.push(
      'REGISTRY_URL must start with http:// or https://',
    )
  }

  // ── AGGREGATE_SYNC_ENABLED (optional, must be 'true' or 'false') ──
  const syncEnabled = config['AGGREGATE_SYNC_ENABLED']
    ? String(config['AGGREGATE_SYNC_ENABLED'])
    : undefined
  if (syncEnabled && !['true', 'false'].includes(syncEnabled)) {
    errors.push(
      `AGGREGATE_SYNC_ENABLED must be 'true' or 'false' (got ${syncEnabled})`,
    )
  }

  // ── AGGREGATE_SYNC_CRON (optional, validate cron pattern) ──
  const syncCron = config['AGGREGATE_SYNC_CRON']
    ? String(config['AGGREGATE_SYNC_CRON'])
    : undefined
  if (syncCron) {
    const cronParts = syncCron.trim().split(/\s+/)
    if (cronParts.length < 5 || cronParts.length > 6) {
      errors.push(
        `AGGREGATE_SYNC_CRON must be a valid cron expression with 5-6 fields (got "${syncCron}")`,
      )
    }
  }

  if (errors.length > 0) {
    const message = `Environment validation failed:\n  - ${errors.join('\n  - ')}`
    logger.error(message)
    throw new Error(message)
  }

  return {
    ...config,
    DATABASE_URL: dbUrl,
    REDIS_URL: String(config['REDIS_URL']),
    JWT_SECRET: jwtSecret,
    VAULT_URL: vaultUrl,
    VAULT_TOKEN: String(config['VAULT_TOKEN']),
    VAULT_SIGNING_KEY_PATH: String(config['VAULT_SIGNING_KEY_PATH']),
    NODE_ID: String(config['NODE_ID']),
    NODE_DOMAIN: String(config['NODE_DOMAIN']),
    PORT: port,
    NODE_ENV: nodeEnv,
  }
}
