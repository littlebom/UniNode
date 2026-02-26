import { Module, Global } from '@nestjs/common'
import { MetricsController } from './metrics.controller'
import { MetricsService } from './metrics.service'

/**
 * Global Prometheus metrics module.
 *
 * Registered globally so any module can inject MetricsService
 * to increment custom counters (e.g., VC issued, transfer requests).
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
