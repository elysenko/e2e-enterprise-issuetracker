import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
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
export class AdminSettingsComponent implements OnInit {
  private readonly data = inject(DataService);

  readonly settings = this.data.settings;

  // transient form drafts keyed by "service:key"
  drafts = signal<Record<string, string>>({});
  savedFor = signal<string | null>(null);

  ngOnInit(): void {
    this.data.loadSettings().subscribe();
  }

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
    const entries = service.keys
      .map((k) => ({ key: k.key, value: this.draftValue(service.service, k.key) }))
      .filter((e) => e.value.trim().length > 0);
    if (entries.length === 0) {
      this.savedFor.set(service.service);
      return;
    }
    this.data.saveSettings(entries).subscribe({
      next: () => {
        // Clear the drafts we just persisted so masked values show through.
        this.drafts.update((d) => {
          const next = { ...d };
          for (const e of entries) delete next[this.draftKey(service.service, e.key)];
          return next;
        });
        this.savedFor.set(service.service);
      },
    });
  }
}
