import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Project, initials } from '../../models';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './admin-projects.component.html',
  styleUrl: './admin-projects.component.css',
})
export class AdminProjectsComponent implements OnInit {
  private readonly data = inject(DataService);

  readonly projects = this.data.projects;
  readonly users = this.data.users;
  readonly initials = initials;

  name = signal('');
  description = signal('');
  error = signal<string | null>(null);

  // per-project member selection
  memberSelection = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.data.loadProjects().subscribe();
    this.data.loadUsers().subscribe();
  }

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
    this.data
      .createProject(this.name().trim(), this.description().trim())
      .subscribe({
        next: () => {
          this.name.set('');
          this.description.set('');
        },
        error: (err) => {
          const message = (err as { error?: { message?: string } })?.error
            ?.message;
          this.error.set(
            typeof message === 'string'
              ? message
              : 'Could not create the project.',
          );
        },
      });
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
    this.data.addMember(project.id, userId).subscribe({
      next: () => this.setSelection(project.id, ''),
    });
  }
}
