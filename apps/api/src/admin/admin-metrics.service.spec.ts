import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@locus/database';
import { AdminMetricsService } from './admin-metrics.service.js';
import { AdminMetricsController } from './admin-metrics.controller.js';

describe('AdminMetricsService & AdminMetricsController', () => {
  let service: AdminMetricsService;
  let controller: AdminMetricsController;

  beforeEach(() => {
    service = new AdminMetricsService();
    controller = new AdminMetricsController(service);
    vi.restoreAllMocks();
  });

  it('aggregates user, sync, classification, and storage telemetry', async () => {
    const now = new Date();

    // Mock db.select
    vi.spyOn(db, 'select').mockImplementation((fields?: any) => {
      // If querying count()
      if (fields && 'count' in fields) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 5 }]),
          }),
        } as any;
      }

      return {
        from: vi.fn().mockImplementation((_table: any) => {
          return {
            where: vi.fn().mockResolvedValue([
              {
                id: 'run-1',
                status: 'succeeded',
                trigger: 'scheduled',
                itemsCreated: 3,
                createdAt: now,
              },
            ]),
            // Fallback for unqualified select
            then: (resolve: any) =>
              resolve([
                {
                  id: 'usr-1',
                  email: 'test@locus.internal',
                  emailVerified: true,
                  createdAt: now,
                  updatedAt: now,
                  provider: 'youtube',
                  status: 'connected',
                  totalCostUsd: '0.0030',
                  estimatedCostInr: '0.25',
                },
              ]),
          };
        }),
      } as any;
    });

    const metrics = await controller.getMetrics();

    expect(metrics).toBeDefined();
    expect(metrics.users).toBeDefined();
    expect(metrics.sync).toBeDefined();
    expect(metrics.aiClassification).toBeDefined();
    expect(metrics.storage).toBeDefined();
    expect(metrics.system).toBeDefined();
    expect(metrics.system.nodeVersion).toBe(process.version);
  });
});

