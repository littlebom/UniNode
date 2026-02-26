import { Injectable, OnModuleInit } from '@nestjs/common'
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
} from 'prom-client'

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry

  /** Total HTTP requests partitioned by method, path, status */
  readonly httpRequestsTotal: Counter<string>

  /** HTTP request duration in seconds */
  readonly httpRequestDuration: Histogram<string>

  /** Total Verifiable Credentials issued */
  readonly vcIssuedTotal: Counter<string>

  /** Total transfer requests */
  readonly transferRequestsTotal: Counter<string>

  /** Total VCs verified */
  readonly vcVerifiedTotal: Counter<string>

  constructor() {
    this.registry = new Registry()
    this.registry.setDefaultLabels({ app: 'uni-node' })

    this.httpRequestsTotal = new Counter({
      name: 'unilink_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    })

    this.httpRequestDuration = new Histogram({
      name: 'unilink_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    })

    this.vcIssuedTotal = new Counter({
      name: 'unilink_vc_issued_total',
      help: 'Total Verifiable Credentials issued',
      labelNames: ['type'],
      registers: [this.registry],
    })

    this.transferRequestsTotal = new Counter({
      name: 'unilink_transfer_requests_total',
      help: 'Total credit transfer requests',
      labelNames: ['status'],
      registers: [this.registry],
    })

    this.vcVerifiedTotal = new Counter({
      name: 'unilink_vc_verified_total',
      help: 'Total VCs verified',
      labelNames: ['result'],
      registers: [this.registry],
    })
  }

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry })
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics()
  }

  getContentType(): string {
    return this.registry.contentType
  }
}
