import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { initials } from '../../models';

@Component({
  selector: 'app-projects',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css',
})
export class ProjectsComponent implements OnInit {
  private readonly data = inject(DataService);
  private readonly auth = inject(AuthService);

  readonly projects = this.data.projects;
  readonly isAdmin = this.auth.isAdmin;
  readonly initials = initials;

  ngOnInit(): void {
    this.data.loadProjects().subscribe();
    // Member names on the cards resolve from the users list (admin-visible).
    if (this.isAdmin()) {
      this.data.loadUsers().subscribe();
    }
  }

  memberNames(memberIds: string[]): string[] {
    return this.data
      .users()
      .filter((u) => memberIds.includes(u.id))
      .map((u) => u.name);
  }
}
