import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PLACEHOLDER = 'PLACEHOLDER_CONFIGURE_IN_SETTINGS';

/** Thrown (503) when a required integration credential is not configured. */
export class ServiceUnconfiguredError extends HttpException {
  constructor(key: string) {
    super(`Service not configured: ${key}`, HttpStatus.SERVICE_UNAVAILABLE);
  }
}

@Injectable()
export class ConfigResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a config value with priority:
   *   1. Environment variable (deploy-time)
   *   2. SystemSetting DB row (admin settings panel)
   *   3. null — unconfigured
   */
  async resolveConfig(key: string): Promise<string | null> {
    const envVal = process.env[key];
    if (envVal && envVal !== PLACEHOLDER) return envVal;

    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    if (setting?.value && setting.value !== PLACEHOLDER) return setting.value;

    return null;
  }

  async resolveOrThrow(key: string): Promise<string> {
    const value = await this.resolveConfig(key);
    if (value === null) throw new ServiceUnconfiguredError(key);
    return value;
  }
}
