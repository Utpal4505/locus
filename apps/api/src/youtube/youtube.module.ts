import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { OAuthStateService } from './oauth-state.service.js';
import { YoutubeChannelService } from './youtube-channel.service.js';
import { YoutubeController } from './youtube.controller.js';
import { YoutubeOAuthService } from './youtube-oauth.service.js';
import { YoutubeVideoService } from './youtube-video.service.js';
import { YoutubeSyncManagerService } from './youtube-sync-manager.service.js';
import { YoutubeSyncSchedulerService } from './youtube-sync-scheduler.service.js';

@Module({
  imports: [AuthModule],
  controllers: [YoutubeController],
  providers: [
    YoutubeOAuthService,
    OAuthStateService,
    YoutubeChannelService,
    YoutubeVideoService,
    YoutubeSyncManagerService,
    YoutubeSyncSchedulerService,
  ],
  exports: [
    YoutubeOAuthService,
    OAuthStateService,
    YoutubeChannelService,
    YoutubeVideoService,
    YoutubeSyncManagerService,
    YoutubeSyncSchedulerService,
  ],
})
export class YoutubeModule {}
