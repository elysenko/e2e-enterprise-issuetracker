import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { parseOrThrow } from '../common/validation';
import { AdminGuard } from '../auth/admin.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SettingsService } from './settings.service';

// Accept either an array of {key,value} or a flat object map.
const patchSchema = z.union([
  z.array(z.object({ key: z.string().min(1), value: z.string() })),
  z.record(z.string()),
]);

@ApiTags('admin-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin/settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  list() {
    return this.settingsService.list();
  }

  @Patch()
  patch(@Body() body: unknown) {
    const parsed = parseOrThrow(patchSchema, body);
    const entries = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed).map(([key, value]) => ({ key, value }));
    return this.settingsService.upsert(entries);
  }
}
