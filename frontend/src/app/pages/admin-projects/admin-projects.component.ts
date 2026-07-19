import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { Project, initials } from '../../models';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './admin-projects.component.html',
  styleUrl: './admin-projects.component.css',
})
export class AdminProjectsComponent {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  readonly projects = this.data.projects;
  readonly users = this.data.users;
  readonly initials = initials;

  name = signal('');
  description = signal('');
  error = signal<string | null>(null);

  // per-project member selection
  memberSelection = signal<Record<string, string>>({});

  memberNames(project: Project): string[] {
    return this.users()
      .filter((u) => project.memberIds.includes(u.id))
      .map((u) => u.name);
  }

  nonMembers(project: Project) {
    return this.users().filter((u) => !project.memberIds.includes(u.id));
  }

  createProject(): void {
    this.error.set(null);
    if (!this.name().trim()) {
      this.error.set('Project name is required.');
      return;
    }
    const user = this.auth.currentUser();
    this.data.projects.update((list) => [
      ...list,
      {
        id: 'p' + (list.length + 1),
        name: this.name().trim(),
        description: this.description().trim() || 'No description provided.',
        createdBy: user?.id ?? 'u1',
        createdAt: new Date(0).toISOString(),
        memberIds: user ? [user.id] : [],
        openIssueCount: 0,
      },
    ]);
    this.name.set('');
    this.description.set('');
  }

  selectionFor(projectId: string): string {
    return this.memberSelection()[projectId] ?? '';
  }

  setSelection(projectId: string, userId: string): void {
    this.memberSelection.update((m) => ({ ...m, [projectId]: userId }));
  }

  addMember(project: Project): void {
    const userId = this.selectionFor(project.id);
    if (!userId) return;
    this.data.projects.update((list) =>
      list.map((p) =>
        p.id === project.id
          ? { ...p, memberIds: [...p.memberIds, userId] }
          : p,
      ),
    );
    this.setSelection(project.id, '');
  }
}
