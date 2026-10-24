import { Controller, Get, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { AdminGuard } from '../auth/admin.guard.js';
import { AdminMetricsService } from './admin-metrics.service.js';
import type { AdminMetricsResponse } from './admin.contract.js';

@Controller('api/admin')
export class AdminMetricsController {
  constructor(private readonly metricsService: AdminMetricsService) {}

  /**
   * Retrieves high-level operational telemetry, user growth, sync health, and storage metrics.
   * Strictly restricted to administrators via AdminGuard.
   */
  @UseGuards(AuthGuard, AdminGuard)
  @Get('metrics')
  @HttpCode(HttpStatus.OK)
  async getMetrics(): Promise<AdminMetricsResponse> {
    return this.metricsService.getMetrics();
  }
}

