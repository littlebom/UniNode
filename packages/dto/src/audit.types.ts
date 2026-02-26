// ── Audit API Types ──────────────────────────────────

export interface AuditLogResponse {
  id: string
  action: string
  actorNode: string | null
  actorDid: string | null
  target: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  result: string | null
  errorMessage: string | null
  timestamp: string
}

export interface AuditStatsResponse {
  totalCount: number
  successCount: number
  failureCount: number
  successRate: number
  byAction: Array<{
    action: string
    count: number
    successCount: number
    failureCount: number
  }>
  byNode: Array<{
    actorNode: string
    count: number
  }>
}

export interface AuditTimeSeriesPoint {
  bucket: string
  action: string
  count: number
  successCount: number
  failureCount: number
}
