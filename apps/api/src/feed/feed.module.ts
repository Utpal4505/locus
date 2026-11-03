import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { FeedController } from './feed.controller.js';
import { FeedService } from './feed.service.js';
import { FeedRepository } from './feed.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [FeedController],
  providers: [FeedRepository, FeedService],
  exports: [FeedService, FeedRepository],
})
export class FeedModule {}
