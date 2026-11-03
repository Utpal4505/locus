import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LibraryController } from './library.controller.js';
import { LibraryService } from './library.service.js';
import { LibraryRepository } from './library.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [LibraryController],
  providers: [LibraryRepository, LibraryService],
  exports: [LibraryService, LibraryRepository],
})
export class LibraryModule {}

