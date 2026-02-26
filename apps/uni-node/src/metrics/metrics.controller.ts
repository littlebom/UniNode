import { Controller, Get, Header, Res } from '@nestjs/common'
import { Response } from 'express'
import { Public } from '../auth/decorators/public.decorator'
import { MetricsService } from './metrics.service'

/**
 * Prometheus metrics endpoint.
 *
 * Exposed at `/metrics` (excluded from global API prefix in main.ts).
 * Marked @Public() because Node uses global APP_GUARD JwtAuthGuard
 * and Prometheus scraper doesn't carry JWT tokens.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @Header('Cache-Control', 'no-store')
  async getMetrics(@Res() res: Response): Promise<void> {
    const metrics = await this.metricsService.getMetrics()
    res.set('Content-Type', this.metricsService.getContentType())
    res.end(metrics)
  }
}
