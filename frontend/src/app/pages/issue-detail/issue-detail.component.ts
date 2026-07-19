import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import {
  IssueStatus,
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  initials,
  priorityClass,
  statusClass,
} from '../../models';
import {
  CommentThreadComponent,
  ReplyEvent,
} from '../../components/comment-thread/comment-thread.component';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, CommentThreadComponent],
  templateUrl: './issue-detail.component.html',
  styleUrl: './issue-detail.component.css',
})
export class IssueDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(DataService);

  readonly statusLabels = STATUS_LABELS;
  readonly priorityLabels = PRIORITY_LABELS;
  readonly statusOrder = STATUS_ORDER;
  readonly statusClass = statusClass;
  readonly priorityClass = priorityClass;
  readonly initials = initials;

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly query = toSignal(this.route.queryParamMap, { requireSync: true });

  readonly projectId = computed(() => this.params().get('projectId') ?? '');
  readonly issueId = computed(() => this.params().get('issueId') ?? '');
  readonly issue = computed(() => {
    const current = this.data.currentIssue();
    return current && current.id === this.issueId() ? current : undefined;
  });
  readonly members = computed(() => this.data.membersForProject(this.projectId()));
  readonly comments = computed(() =>
    this.data.comments().filter((c) => c.issueId === this.issueId()),
  );

  constructor() {
    // Load the issue, its comments, and the project members whenever the
    // routed ids change.
    effect(() => {
      const issueId = this.issueId();
      if (issueId) {
        this.data.loadIssue(issueId).subscribe();
        this.data.loadComments(issueId).subscribe();
      }
    });
    effect(() => {
      const projectId = this.projectId();
      if (projectId) {
        this.data.loadProjectMembers(projectId).subscribe();
      }
    });
  }

  readonly assignOpen = computed(() => this.query().get('modal') === 'assign');
  assignSelection = signal<string>('');

  setStatus(status: IssueStatus): void {
    const id = this.issueId();
    if (!id) return;
    this.data.updateIssue(id, { status }).subscribe();
  }

  openAssign(): void {
    this.assignSelection.set(this.issue()?.assigneeId ?? '');
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: 'assign' },
      queryParamsHandling: 'merge',
    });
  }

  closeAssign(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { modal: null },
      queryParamsHandling: 'merge',
    });
  }

  confirmAssign(): void {
    const id = this.issueId();
    if (!id) return;
    const assigneeId = this.assignSelection() || null;
    this.data.updateIssue(id, { assigneeId }).subscribe({
      next: () => this.closeAssign(),
      error: () => this.closeAssign(),
    });
  }

  addComment(event: ReplyEvent): void {
    const id = this.issueId();
    if (!id) return;
    this.data.createComment(id, event.body, event.parentId).subscribe();
  }
}
