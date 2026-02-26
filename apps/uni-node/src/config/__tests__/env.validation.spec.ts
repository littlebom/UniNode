import { validateEnv } from '../env.validation'

describe('validateEnv', () => {
  const validConfig: Record<string, unknown> = {
    DATABASE_URL: 'postgresql://user:pass@localhost:5433/uninode',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'a'.repeat(64),
    VAULT_URL: 'http://localhost:8200',
    VAULT_TOKEN: 'dev-root-token',
    VAULT_SIGNING_KEY_PATH: 'tu-ac-th',
    NODE_ID: 'tu.ac.th',
    NODE_DOMAIN: 'tu.ac.th',
    PORT: '3010',
    NODE_ENV: 'development',
  }

  it('should pass with valid configuration', () => {
    const result = validateEnv({ ...validConfig })

    expect(result.DATABASE_URL).toBe(validConfig.DATABASE_URL)
    expect(result.REDIS_URL).toBe(validConfig.REDIS_URL)
    expect(result.JWT_SECRET).toBe(validConfig.JWT_SECRET)
    expect(result.VAULT_URL).toBe(validConfig.VAULT_URL)
    expect(result.VAULT_TOKEN).toBe(validConfig.VAULT_TOKEN)
    expect(result.VAULT_SIGNING_KEY_PATH).toBe(validConfig.VAULT_SIGNING_KEY_PATH)
    expect(result.NODE_ID).toBe(validConfig.NODE_ID)
    expect(result.NODE_DOMAIN).toBe(validConfig.NODE_DOMAIN)
    expect(result.PORT).toBe(3010)
    expect(result.NODE_ENV).toBe('development')
  })

  it('should throw when required variables are missing', () => {
    expect(() => validateEnv({})).toThrow('Environment validation failed')
    expect(() => validateEnv({})).toThrow('DATABASE_URL is required')
    expect(() => validateEnv({})).toThrow('REDIS_URL is required')
    expect(() => validateEnv({})).toThrow('JWT_SECRET is required')
    expect(() => validateEnv({})).toThrow('VAULT_URL is required')
    expect(() => validateEnv({})).toThrow('VAULT_TOKEN is required')
    expect(() => validateEnv({})).toThrow('VAULT_SIGNING_KEY_PATH is required')
    expect(() => validateEnv({})).toThrow('NODE_ID is required')
    expect(() => validateEnv({})).toThrow('NODE_DOMAIN is required')
  })

  it('should throw when JWT_SECRET is too short', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        JWT_SECRET: 'short-secret',
      }),
    ).toThrow('JWT_SECRET must be at least 64 characters')
  })

  it('should throw when DATABASE_URL has invalid format', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        DATABASE_URL: 'mysql://user:pass@localhost/db',
      }),
    ).toThrow('DATABASE_URL must start with postgresql:// or postgres://')
  })

  it('should throw when VAULT_URL has invalid format', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        VAULT_URL: 'ftp://vault.local',
      }),
    ).toThrow('VAULT_URL must start with http:// or https://')
  })

  it('should accept https:// for VAULT_URL', () => {
    const result = validateEnv({
      ...validConfig,
      VAULT_URL: 'https://vault.unilink.ac.th',
    })

    expect(result.VAULT_URL).toBe('https://vault.unilink.ac.th')
  })

  it('should throw when PORT is out of range', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        PORT: '99999',
      }),
    ).toThrow('PORT must be between 1 and 65535')
  })

  it('should accept postgres:// prefix for DATABASE_URL', () => {
    const result = validateEnv({
      ...validConfig,
      DATABASE_URL: 'postgres://user:pass@localhost:5433/uninode',
    })

    expect(result.DATABASE_URL).toBe('postgres://user:pass@localhost:5433/uninode')
  })

  it('should default PORT to 3010 when not provided', () => {
    const config = { ...validConfig }
    delete config.PORT

    const result = validateEnv(config)
    expect(result.PORT).toBe(3010)
  })

  it('should throw when NODE_ENV is invalid', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        NODE_ENV: 'staging',
      }),
    ).toThrow('NODE_ENV must be one of: development, production, test')
  })

  // ── REGISTRY_URL (optional) ──────────────────────────────

  it('should pass with valid http:// REGISTRY_URL', () => {
    const result = validateEnv({
      ...validConfig,
      REGISTRY_URL: 'http://localhost:3000/api/v1',
    })
    expect(result).toBeDefined()
  })

  it('should pass with valid https:// REGISTRY_URL', () => {
    const result = validateEnv({
      ...validConfig,
      REGISTRY_URL: 'https://registry.unilink.ac.th/api/v1',
    })
    expect(result).toBeDefined()
  })

  it('should throw when REGISTRY_URL has invalid format', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        REGISTRY_URL: 'ftp://registry.local',
      }),
    ).toThrow('REGISTRY_URL must start with http:// or https://')
  })

  it('should pass when REGISTRY_URL is not provided', () => {
    const config = { ...validConfig }
    delete config.REGISTRY_URL
    const result = validateEnv(config)
    expect(result).toBeDefined()
  })

  // ── AGGREGATE_SYNC_ENABLED (optional) ────────────────────

  it('should pass with AGGREGATE_SYNC_ENABLED=true', () => {
    const result = validateEnv({
      ...validConfig,
      AGGREGATE_SYNC_ENABLED: 'true',
    })
    expect(result).toBeDefined()
  })

  it('should pass with AGGREGATE_SYNC_ENABLED=false', () => {
    const result = validateEnv({
      ...validConfig,
      AGGREGATE_SYNC_ENABLED: 'false',
    })
    expect(result).toBeDefined()
  })

  it('should throw when AGGREGATE_SYNC_ENABLED is invalid', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        AGGREGATE_SYNC_ENABLED: 'yes',
      }),
    ).toThrow("AGGREGATE_SYNC_ENABLED must be 'true' or 'false'")
  })

  it('should pass when AGGREGATE_SYNC_ENABLED is not provided', () => {
    const config = { ...validConfig }
    delete config.AGGREGATE_SYNC_ENABLED
    const result = validateEnv(config)
    expect(result).toBeDefined()
  })

  // ── AGGREGATE_SYNC_CRON (optional) ───────────────────────

  it('should pass with valid 5-field cron expression', () => {
    const result = validateEnv({
      ...validConfig,
      AGGREGATE_SYNC_CRON: '0 2 * * *',
    })
    expect(result).toBeDefined()
  })

  it('should pass with valid 6-field cron expression', () => {
    const result = validateEnv({
      ...validConfig,
      AGGREGATE_SYNC_CRON: '0 0 2 * * *',
    })
    expect(result).toBeDefined()
  })

  it('should throw when AGGREGATE_SYNC_CRON has too few fields', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        AGGREGATE_SYNC_CRON: '0 2 *',
      }),
    ).toThrow('AGGREGATE_SYNC_CRON must be a valid cron expression with 5-6 fields')
  })

  it('should throw when AGGREGATE_SYNC_CRON has too many fields', () => {
    expect(() =>
      validateEnv({
        ...validConfig,
        AGGREGATE_SYNC_CRON: '0 0 2 * * * *',
      }),
    ).toThrow('AGGREGATE_SYNC_CRON must be a valid cron expression with 5-6 fields')
  })

  it('should pass when AGGREGATE_SYNC_CRON is not provided', () => {
    const config = { ...validConfig }
    delete config.AGGREGATE_SYNC_CRON
    const result = validateEnv(config)
    expect(result).toBeDefined()
  })
})
