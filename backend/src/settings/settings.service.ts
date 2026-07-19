import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PLACEHOLDER = 'PLACEHOLDER_CONFIGURE_IN_SETTINGS';

interface SettingKeyDef {
  key: string;
  label: string;
}

interface ServiceGroupDef {
  service: string;
  label: string;
  keys: SettingKeyDef[];
}

/**
 * Service credential groups surfaced in the admin settings panel. Mirrors the
 * approved frontend `ServiceSetting` shape. Values are resolved from env first,
 * then the SystemSetting table; secrets are masked before leaving the server.
 */
const SERVICE_GROUPS: ServiceGroupDef[] = [
  {
    service: 'postgresql',
    label: 'PostgreSQL',
    keys: [
      { key: 'POSTGRES_HOST', label: 'Host' },
      { key: 'POSTGRES_USER', label: 'User' },
      { key: 'POSTGRES_PASSWORD', label: 'Password' },
    ],
  },
  {
    service: 'minio',
    label: 'MinIO Object Storage',
    keys: [
      { key: 'MINIO_ENDPOINT', label: 'Endpoint' },
      { key: 'MINIO_ACCESS_KEY', label: 'Access Key' },
      { key: 'MINIO_SECRET_KEY', label: 'Secret Key' },
    ],
  },
];

function isSecret(key: string): boolean {
  return key.includes('SECRET') || key.includes('PASSWORD') || key.includes('KEY');
}

function mask(key: string, value: string): string {
  if (!value) return '';
  if (isSecret(key)) return '••••••••••';
  return value;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolve(key: string): Promise<string> {
    const envVal = process.env[key];
    if (envVal && envVal !== PLACEHOLDER) return envVal;
    const row = await this.prisma.systemSetting.findUnique({ where: { key } });
    if (row?.value && row.value !== PLACEHOLDER) return row.value;
    return '';
  }

  /** Returns each service group with masked values + configured status. */
  async list() {
    const groups = [];
    for (const group of SERVICE_GROUPS) {
      const keys = [];
      for (const def of group.keys) {
        const value = await this.resolve(def.key);
        keys.push({
          key: def.key,
          label: def.label,
          maskedValue: mask(def.key, value),
        });
      }
      groups.push({
        service: group.service,
        label: group.label,
        configured: keys.every((k) => k.maskedValue.length > 0),
        keys,
      });
    }
    return groups;
  }

  /** Upsert key/value pairs into SystemSetting. */
  async upsert(entries: { key: string; value: string }[]) {
    await Promise.all(
      entries.map((e) =>
        this.prisma.systemSetting.upsert({
          where: { key: e.key },
          update: { value: e.value },
          create: { key: e.key, value: e.value },
        }),
      ),
    );
    return this.list();
  }
}
