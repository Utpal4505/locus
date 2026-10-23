import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { YoutubeModule } from './youtube/youtube.module.js';
import { FeedModule } from './feed/feed.module.js';
import { PreferencesModule } from './preferences/preferences.module.js';
import { LibraryModule } from './library/library.module.js';
import { VideoModule } from './videos/video.module.js';
import { SearchModule } from './search/search.module.js';
import { ApiExceptionFilter } from './common/filters/api-exception.filter.js';

@Module({
  imports: [
    AuthModule,
    YoutubeModule,
    FeedModule,
    PreferencesModule,
    LibraryModule,
    VideoModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: ApiExceptionFilter,
    },
  ],
})
export class AppModule {}
