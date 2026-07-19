import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Role, initials } from '../../models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.css',
})
export class AdminUsersComponent {
  private readonly data = inject(DataService);

  readonly users = this.data.users;
  readonly initials = initials;
  readonly roles: Role[] = ['ADMIN', 'MEMBER'];

  setRole(userId: string, role: Role): void {
    this.data.users.update((list) =>
      list.map((u) => (u.id === userId ? { ...u, role } : u)),
    );
  }

  roleClass(role: Role): string {
    return role === 'ADMIN' ? 'badge-role-admin' : 'badge-role-member';
  }
}
