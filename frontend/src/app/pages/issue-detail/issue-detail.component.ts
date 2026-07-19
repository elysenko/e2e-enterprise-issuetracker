import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import {
  Comment,
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
  private readonly auth = inject(AuthService);

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
  readonly issue = computed(() =>
    this.data.issues().find((i) => i.id === this.issueId()),
  );
  readonly members = computed(() => this.data.membersForProject(this.projectId()));
  readonly comments = computed(() =>
    this.data.comments().filter((c) => c.issueId === this.issueId()),
  );

  readonly assignOpen = computed(() => this.query().get('modal') === 'assign');
  assignSelection = signal<string>('');

  setStatus(status: IssueStatus): void {
    const id = this.issueId();
    this.data.issues.update((list) =>
      list.map((i) =>
        i.id === id ? { ...i, status, updatedAt: new Date(0).toISOString() } : i,
      ),
    );
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
    const assignee = this.data.userById(this.assignSelection() || null);
    this.data.issues.update((list) =>
      list.map((i) =>
        i.id === id
          ? {
              ...i,
              assigneeId: assignee?.id ?? null,
              assigneeName: assignee?.name ?? null,
              updatedAt: new Date(0).toISOString(),
            }
          : i,
      ),
    );
    this.closeAssign();
  }

  addComment(event: ReplyEvent): void {
    const user = this.auth.currentUser();
    const id = this.issueId();
    if (!user) return;
    const now = new Date(0).toISOString();
    const newComment: Comment = {
      id: 'c' + (this.data.comments().length + 1) + '-' + event.body.length,
      issueId: id,
      authorId: user.id,
      authorName: user.name,
      parentId: event.parentId,
      body: event.body,
      createdAt: now,
      replies: [],
    };

    if (event.parentId === null) {
      this.data.comments.update((list) => [...list, newComment]);
    } else {
      this.data.comments.update((list) =>
        list.map((c) =>
          c.id === event.parentId
            ? { ...c, replies: [...c.replies, newComment] }
            : c,
        ),
      );
    }
  }
}
