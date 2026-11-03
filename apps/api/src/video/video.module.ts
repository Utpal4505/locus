import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { VideoController } from './video.controller.js';
import { VideoService } from './video.service.js';
import { VideoRepository } from './video.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [VideoController],
  providers: [VideoRepository, VideoService],
  exports: [VideoService, VideoRepository],
})
export class VideoModule {}

