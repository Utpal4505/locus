import { Module } from '@nestjs/common';
import { AdminMetricsController } from './admin-metrics.controller.js';
import { AdminMetricsService } from './admin-metrics.service.js';
import { AdminMetricsRepository } from './admin-metrics.repository.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [AdminMetricsController],
  providers: [AdminMetricsRepository, AdminMetricsService],
  exports: [AdminMetricsService, AdminMetricsRepository],
})
export class AdminModule {}

