import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Priority, PRIORITY_ORDER, PRIORITY_LABELS, User } from '../../models';

export interface NewIssueDraft {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string | null;
}

@Component({
  selector: 'app-new-issue-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './new-issue-modal.component.html',
  styleUrl: './new-issue-modal.component.css',
})
export class NewIssueModalComponent {
  @Input() members: User[] = [];
  @Output() closed = new EventEmitter<void>();
  @Output() created = new EventEmitter<NewIssueDraft>();

  readonly priorities = PRIORITY_ORDER;
  readonly priorityLabels = PRIORITY_LABELS;

  title = signal('');
  description = signal('');
  priority = signal<Priority>('MEDIUM');
  assigneeId = signal<string>('');
  error = signal<string | null>(null);

  submit(): void {
    if (!this.title().trim()) {
      this.error.set('A title is required.');
      return;
    }
    this.created.emit({
      title: this.title().trim(),
      description: this.description().trim(),
      priority: this.priority(),
      assigneeId: this.assigneeId() || null,
    });
  }
}
