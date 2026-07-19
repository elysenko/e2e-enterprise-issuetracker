import { Module } from '@nestjs/common';
import { ConfigResolverService } from '../common/config.service';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, ConfigResolverService],
  exports: [SettingsService, ConfigResolverService],
})
export class SettingsModule {}
