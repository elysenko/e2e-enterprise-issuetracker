import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import {
  IssueStatus,
  PRIORITY_LABELS,
  STATUS_LABELS,
  priorityClass,
  statusClass,
} from '../../models';
import {
  NewIssueDraft,
  NewIssueModalComponent,
} from '../../components/new-issue-modal/new-issue-modal.component';

@Component({
  selector: 'app-project-issues',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, NewIssueModalComponent],
  templateUrl: './project-issues.component.html',
  styleUrl: './project-issues.component.css',
})
export class ProjectIssuesComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusClass = statusClass;
  readonly priorityClass = priorityClass;

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  readonly projectId = computed(() => this.params().get('projectId') ?? '');
  readonly project = computed(() => this.data.projectById(this.projectId()));
  readonly members = computed(() => this.data.membersForProject(this.projectId()));

  readonly activeStatus = computed<IssueStatus | 'ALL'>(() => {
    const s = this.query().get('status');
    return s === 'OPEN' || s === 'IN_PROGRESS' || s === 'RESOLVED' ? s : 'ALL';
  });

  readonly modalOpen = computed(() => this.query().get('modal') === 'new-issue');

  readonly filters: { key: IssueStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
  ];

  readonly issues = computed(() => {
    const all = this.data.issues().filter((i) => i.projectId === this.projectId());
    const status = this.activeStatus();
    return status === 'ALL' ? all : all.filter((i) => i.status === status);
  });

  setStatus(status: IssueStatus | 'ALL'): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { status: status === 'ALL' ? null : status },
      queryParamsHandling: 'merge',
    });
  }

  openModal(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: 'new-issue' },
      queryParamsHandling: 'merge',
    });
  }

  closeModal(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: null },
      queryParamsHandling: 'merge',
    });
  }

  createIssue(draft: NewIssueDraft): void {
    const project = this.project();
    const user = this.auth.currentUser();
    if (!project || !user) return;
    const assignee = this.data.userById(draft.assigneeId);
    const now = new Date(0).toISOString();
    this.data.issues.update((list) => [
      {
        id: 'i' + (list.length + 1) + '-' + draft.title.length,
        projectId: project.id,
        projectName: project.name,
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        status: 'OPEN',
        assigneeId: assignee?.id ?? null,
        assigneeName: assignee?.name ?? null,
        createdBy: user.id,
        createdByName: user.name,
        createdAt: now,
        updatedAt: now,
      },
      ...list,
    ]);
    this.closeModal();
  }
}
