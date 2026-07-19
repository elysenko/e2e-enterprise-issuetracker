import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
} from '@angular/core';
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
export class ProjectIssuesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  constructor() {
    // Reload the issue list whenever the selected project or status filter
    // changes (both derive from the URL).
    effect(() => {
      const projectId = this.projectId();
      const status = this.activeStatus();
      if (projectId) {
        this.data.loadProjectIssues(projectId, status).subscribe();
      }
    });
    // Members drive the assignee dropdown in the New Issue modal.
    effect(() => {
      const projectId = this.projectId();
      if (projectId) {
        this.data.loadProjectMembers(projectId).subscribe();
      }
    });
  }

  ngOnInit(): void {
    // Populate the project switcher dropdown in the list header.
    this.data.loadProjects().subscribe();
  }

  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusClass = statusClass;
  readonly priorityClass = priorityClass;

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  readonly projectId = computed(() => this.params().get('projectId') ?? '');
  readonly project = computed(() => this.data.projectById(this.projectId()));
  readonly members = computed(() => this.data.membersForProject(this.projectId()));
  readonly projects = computed(() => this.data.projects());

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

  onProjectChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id && id !== this.projectId()) {
      this.router.navigate(['/projects', id]);
    }
  }

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
    const projectId = this.projectId();
    if (!projectId) return;
    this.data
      .createIssue(projectId, {
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        assigneeId: draft.assigneeId,
      })
      .subscribe({
        next: (issue) => {
          const refresh = () =>
            this.data
              .loadProjectIssues(projectId, this.activeStatus())
              .subscribe();
          // The create endpoint sets creator/status; apply the assignee, if
          // chosen, as a follow-up PATCH, then refresh the list.
          if (draft.assigneeId) {
            this.data
              .updateIssue(issue.id, { assigneeId: draft.assigneeId })
              .subscribe({ next: refresh, error: refresh });
          } else {
            refresh();
          }
          this.closeModal();
        },
      });
  }
}
