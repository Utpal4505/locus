import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OAuthStateService } from './services/oauth-state.service.js';
import { YoutubeChannelService } from './services/youtube-channel.service.js';
import { YoutubeController } from './controllers/youtube.controller.js';
import { YoutubeOAuthService } from './services/youtube-oauth.service.js';
import { YoutubeVideoService } from './services/youtube-video.service.js';
import { YoutubeSyncManagerService } from './services/youtube-sync-manager.service.js';
import { YoutubeSyncSchedulerService } from './services/youtube-sync-scheduler.service.js';
import { YoutubeIntegrationRepository } from './repositories/youtube-integration.repository.js';
import { YoutubeChannelRepository } from './repositories/youtube-channel.repository.js';
import { YoutubeSyncRepository } from './repositories/youtube-sync.repository.js';
import { YoutubeVideoRepository } from './repositories/youtube-video.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [YoutubeController],
  providers: [
    YoutubeIntegrationRepository,
    YoutubeChannelRepository,
    YoutubeSyncRepository,
    YoutubeVideoRepository,
    YoutubeOAuthService,
    OAuthStateService,
    YoutubeChannelService,
    YoutubeVideoService,
    YoutubeSyncManagerService,
    YoutubeSyncSchedulerService,
  ],
  exports: [
    YoutubeIntegrationRepository,
    YoutubeChannelRepository,
    YoutubeSyncRepository,
    YoutubeVideoRepository,
    YoutubeOAuthService,
    OAuthStateService,
    YoutubeChannelService,
    YoutubeVideoService,
    YoutubeSyncManagerService,
    YoutubeSyncSchedulerService,
  ],
})
export class YoutubeModule {}
