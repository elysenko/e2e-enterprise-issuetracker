import { Routes } from '@angular/router';
import { requireAdmin, requireAuth } from './guards/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/app-layout.component').then((m) => m.AppLayoutComponent),
    canActivate: [requireAuth],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'projects',
        loadComponent: () =>
          import('./pages/projects/projects.component').then(
            (m) => m.ProjectsComponent,
          ),
      },
      {
        path: 'projects/:projectId',
        loadComponent: () =>
          import('./pages/project-issues/project-issues.component').then(
            (m) => m.ProjectIssuesComponent,
          ),
      },
      {
        path: 'projects/:projectId/issues/:issueId',
        loadComponent: () =>
          import('./pages/issue-detail/issue-detail.component').then(
            (m) => m.IssueDetailComponent,
          ),
      },
      {
        path: 'admin/projects',
        canActivate: [requireAdmin],
        loadComponent: () =>
          import('./pages/admin-projects/admin-projects.component').then(
            (m) => m.AdminProjectsComponent,
          ),
      },
      {
        path: 'admin/users',
        canActivate: [requireAdmin],
        loadComponent: () =>
          import('./pages/admin-users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
      {
        path: 'admin/settings',
        canActivate: [requireAdmin],
        loadComponent: () =>
          import('./pages/admin-settings/admin-settings.component').then(
            (m) => m.AdminSettingsComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
