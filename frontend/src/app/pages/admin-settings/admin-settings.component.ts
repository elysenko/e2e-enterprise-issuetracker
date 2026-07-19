import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { ServiceSetting } from '../../models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.css',
})
export class AdminSettingsComponent {
  private readonly data = inject(DataService);

  readonly settings = this.data.settings;

  // transient form drafts keyed by "service:key"
  drafts = signal<Record<string, string>>({});
  savedFor = signal<string | null>(null);

  draftKey(service: string, key: string): string {
    return `${service}:${key}`;
  }

  setDraft(service: string, key: string, value: string): void {
    this.drafts.update((d) => ({ ...d, [this.draftKey(service, key)]: value }));
  }

  draftValue(service: string, key: string): string {
    return this.drafts()[this.draftKey(service, key)] ?? '';
  }

  save(service: ServiceSetting): void {
    this.data.settings.update((list) =>
      list.map((s) => {
        if (s.service !== service.service) return s;
        const keys = s.keys.map((k) => {
          const draft = this.draftValue(s.service, k.key);
          if (!draft) return k;
          const masked =
            k.key.includes('SECRET') || k.key.includes('PASSWORD')
              ? '••••••••••'
              : draft;
          return { ...k, maskedValue: masked };
        });
        const configured = keys.every((k) => k.maskedValue.length > 0);
        return { ...s, keys, configured };
      }),
    );
    this.savedFor.set(service.service);
  }
}
