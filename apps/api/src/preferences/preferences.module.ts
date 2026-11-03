import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PreferencesController } from './preferences.controller.js';
import { PreferencesService } from './preferences.service.js';
import { PreferencesRepository } from './preferences.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [PreferencesController],
  providers: [PreferencesRepository, PreferencesService],
  exports: [PreferencesService, PreferencesRepository],
})
export class PreferencesModule {}

