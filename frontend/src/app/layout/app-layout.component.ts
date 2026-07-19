import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { initials } from '../models';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  admin?: boolean;
}

@Component({
  selector: 'app-layout',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.css',
})
export class AppLayoutComponent {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;
  readonly isAdmin = this.auth.isAdmin;

  readonly navItems = computed<NavItem[]>(() => {
    const base: NavItem[] = [
      { label: 'Dashboard', icon: '▤', route: '/dashboard' },
      { label: 'Projects', icon: '▦', route: '/projects' },
    ];
    if (this.isAdmin()) {
      base.push(
        { label: 'Projects', icon: '⚙', route: '/admin/projects', admin: true },
        { label: 'Users', icon: '☺', route: '/admin/users', admin: true },
        { label: 'Settings', icon: '⚡', route: '/admin/settings', admin: true },
      );
    }
    return base;
  });

  userInitials = computed(() => initials(this.user()?.name ?? '?'));

  logout(): void {
    this.auth.logout();
  }
}
