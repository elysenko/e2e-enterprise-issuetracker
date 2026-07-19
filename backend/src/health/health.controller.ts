import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness — public, no DB dependency. */
  @Get()
  check(): { status: string } {
    return { status: 'ok' };
  }

  /** Readiness — public; runs a trivial query and reports DB status. */
  @Get('deep')
  @HttpCode(HttpStatus.OK)
  async deep(): Promise<{ status: string; db: string }> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'ok', db: 'ok' };
    } catch {
      return { status: 'error', db: 'error' };
    }
  }
}
