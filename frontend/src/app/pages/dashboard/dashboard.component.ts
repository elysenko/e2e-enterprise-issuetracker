import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  priorityClass,
  statusClass,
} from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly data = inject(DataService);

  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusClass = statusClass;
  readonly priorityClass = priorityClass;

  readonly issues = this.data.issues;

  readonly stats = computed(() => {
    const all = this.issues();
    return {
      total: all.length,
      open: all.filter((i) => i.status === 'OPEN').length,
      inProgress: all.filter((i) => i.status === 'IN_PROGRESS').length,
      resolved: all.filter((i) => i.status === 'RESOLVED').length,
    };
  });

  readonly recent = computed(() =>
    [...this.issues()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}
