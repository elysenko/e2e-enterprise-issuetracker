import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Comment, initials } from '../../models';

export interface ReplyEvent {
  parentId: string | null;
  body: string;
}

@Component({
  selector: 'app-comment-thread',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-thread.component.html',
  styleUrl: './comment-thread.component.css',
})
export class CommentThreadComponent {
  @Input() comments: Comment[] = [];
  @Output() reply = new EventEmitter<ReplyEvent>();

  readonly initials = initials;

  replyingTo = signal<string | null>(null);
  replyBody = signal('');
  newBody = signal('');

  startReply(id: string): void {
    this.replyingTo.set(id);
    this.replyBody.set('');
  }

  cancelReply(): void {
    this.replyingTo.set(null);
    this.replyBody.set('');
  }

  submitReply(parentId: string): void {
    if (!this.replyBody().trim()) return;
    this.reply.emit({ parentId, body: this.replyBody().trim() });
    this.cancelReply();
  }

  submitTopLevel(): void {
    if (!this.newBody().trim()) return;
    this.reply.emit({ parentId: null, body: this.newBody().trim() });
    this.newBody.set('');
  }
}
