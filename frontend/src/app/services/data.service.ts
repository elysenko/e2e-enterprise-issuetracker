import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import {
  Comment,
  Issue,
  IssueStatus,
  Priority,
  Project,
  Role,
  ServiceSetting,
  User,
} from '../models';
import { API_BASE } from './api';

export interface NewIssueInput {
  title: string;
  description: string;
  priority: Priority;
  assigneeId: string | null;
}

/**
 * Live data layer for the Issue Tracker. Every collection the UI reads is held
 * in a signal that is populated from the NestJS REST API (`/api/*`); mutations
 * POST/PATCH to the backend and then refresh the relevant signal. Components
 * call the `load*` methods on init and read the signals reactively — the same
 * shape the mockup exposed, now backed by real persistence.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly http = inject(HttpClient);

  readonly users = signal<User[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly issues = signal<Issue[]>([]);
  readonly currentIssue = signal<Issue | null>(null);
  readonly comments = signal<Comment[]>([]);
  readonly projectMembers = signal<User[]>([]);
  readonly settings = signal<ServiceSetting[]>([]);

  // ---- Loaders ----
  loadUsers(): Observable<User[]> {
    return this.http
      .get<User[]>(`${API_BASE}/users`)
      .pipe(tap((users) => this.users.set(users)));
  }

  loadProjects(): Observable<Project[]> {
    return this.http
      .get<Project[]>(`${API_BASE}/projects`)
      .pipe(tap((projects) => this.projects.set(projects)));
  }

  loadDashboardIssues(): Observable<Issue[]> {
    return this.http
      .get<Issue[]>(`${API_BASE}/dashboard/issues`)
      .pipe(tap((issues) => this.issues.set(issues)));
  }

  loadProjectIssues(
    projectId: string,
    status?: IssueStatus | 'ALL',
  ): Observable<Issue[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') {
      params = params.set('status', status);
    }
    return this.http
      .get<Issue[]>(`${API_BASE}/projects/${projectId}/issues`, { params })
      .pipe(tap((issues) => this.issues.set(issues)));
  }

  loadProjectMembers(projectId: string): Observable<User[]> {
    return this.http
      .get<User[]>(`${API_BASE}/projects/${projectId}/members`)
      .pipe(tap((members) => this.projectMembers.set(members)));
  }

  loadIssue(issueId: string): Observable<Issue> {
    return this.http
      .get<Issue>(`${API_BASE}/issues/${issueId}`)
      .pipe(tap((issue) => this.currentIssue.set(issue)));
  }

  loadComments(issueId: string): Observable<Comment[]> {
    return this.http
      .get<Comment[]>(`${API_BASE}/issues/${issueId}/comments`)
      .pipe(tap((comments) => this.comments.set(comments)));
  }

  loadSettings(): Observable<ServiceSetting[]> {
    return this.http
      .get<ServiceSetting[]>(`${API_BASE}/admin/settings`)
      .pipe(tap((settings) => this.settings.set(settings)));
  }

  // ---- Mutations ----
  createProject(name: string, description: string): Observable<Project> {
    return this.http
      .post<Project>(`${API_BASE}/projects`, { name, description })
      .pipe(tap((project) => this.projects.update((list) => [project, ...list])));
  }

  addMember(projectId: string, userId: string): Observable<User[]> {
    return this.http
      .post<User[]>(`${API_BASE}/projects/${projectId}/members`, { userId })
      .pipe(
        tap((members) => {
          this.projectMembers.set(members);
          this.projects.update((list) =>
            list.map((p) =>
              p.id === projectId
                ? { ...p, memberIds: members.map((m) => m.id) }
                : p,
            ),
          );
        }),
      );
  }

  createIssue(projectId: string, input: NewIssueInput): Observable<Issue> {
    return this.http
      .post<Issue>(`${API_BASE}/projects/${projectId}/issues`, {
        title: input.title,
        description: input.description,
        priority: input.priority,
      })
      .pipe(
        tap((issue) => {
          // If the new issue has an assignee, apply it in a follow-up patch —
          // the create endpoint sets creator/status only.
          this.issues.update((list) => [issue, ...list]);
        }),
      );
  }

  updateIssue(
    issueId: string,
    patch: Partial<
      Pick<Issue, 'title' | 'description' | 'priority' | 'status' | 'assigneeId'>
    >,
  ): Observable<Issue> {
    return this.http
      .patch<Issue>(`${API_BASE}/issues/${issueId}`, patch)
      .pipe(
        tap((issue) => {
          this.currentIssue.set(issue);
          this.issues.update((list) =>
            list.map((i) => (i.id === issue.id ? issue : i)),
          );
        }),
      );
  }

  createComment(
    issueId: string,
    body: string,
    parentId: string | null,
  ): Observable<Comment> {
    return this.http
      .post<Comment>(`${API_BASE}/issues/${issueId}/comments`, {
        body,
        parentId,
      })
      .pipe(tap(() => this.loadComments(issueId).subscribe()));
  }

  updateUserRole(userId: string, role: Role): Observable<User> {
    return this.http
      .patch<User>(`${API_BASE}/users/${userId}`, { role })
      .pipe(
        tap((user) =>
          this.users.update((list) =>
            list.map((u) => (u.id === user.id ? user : u)),
          ),
        ),
      );
  }

  saveSettings(
    entries: { key: string; value: string }[],
  ): Observable<ServiceSetting[]> {
    return this.http
      .patch<ServiceSetting[]>(`${API_BASE}/admin/settings`, entries)
      .pipe(tap((settings) => this.settings.set(settings)));
  }

  // ---- Derived selectors (read from the loaded signals) ----
  projectById(id: string): Project | undefined {
    return this.projects().find((p) => p.id === id);
  }

  issuesForProject = (projectId: string) =>
    computed(() => this.issues().filter((i) => i.projectId === projectId));

  issueById(id: string): Issue | undefined {
    return this.issues().find((i) => i.id === id);
  }

  /** Members of the currently loaded project (populated by loadProjectMembers). */
  membersForProject(_projectId: string): User[] {
    return this.projectMembers();
  }

  commentsForIssue = (issueId: string) =>
    computed(() => this.comments().filter((c) => c.issueId === issueId));

  userById(id: string | null): User | undefined {
    if (!id) return undefined;
    const all = [...this.users(), ...this.projectMembers()];
    return all.find((u) => u.id === id);
  }
}
