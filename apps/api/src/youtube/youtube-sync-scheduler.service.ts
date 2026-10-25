import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import {
  TWO_HOURS_MS,
  YoutubeSyncManagerService,
} from './youtube-sync-manager.service.js';

@Injectable()
export class YoutubeSyncSchedulerService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(YoutubeSyncSchedulerService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly syncManager: YoutubeSyncManagerService) {}

  onApplicationBootstrap() {
    // Avoid running unmocked background timers during unit tests
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.logger.log(
      'Initializing 2-hour scheduled server-side YouTube video sync timer...',
    );

    this.timer = setInterval(() => {
      void this.triggerScheduledCycle();
    }, TWO_HOURS_MS);
  }

  onApplicationShutdown() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.logger.log('2-hour YouTube sync scheduler timer stopped.');
    }
  }

  /**
   * Safely triggers a scheduled sync cycle across all connected users.
   */
  async triggerScheduledCycle() {
    try {
      await this.syncManager.runScheduledSync();
    } catch (err) {
      this.logger.error(
        `Scheduled sync cycle encountered an error: ${(err as Error).message}`,
      );
    }
  }
}

