import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { SearchController } from './search.controller.js';
import { SearchService } from './search.service.js';
import { SearchRepository } from './search.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [SearchController],
  providers: [SearchRepository, SearchService],
  exports: [SearchService, SearchRepository],
})
export class SearchModule {}

