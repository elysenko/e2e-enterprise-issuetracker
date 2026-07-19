import { Injectable, computed, signal } from '@angular/core';
import {
  Comment,
  Issue,
  Project,
  ServiceSetting,
  User,
} from '../models';

/**
 * Central mock-data store for the mockup.
 *
 * Every collection the backend will eventually provide is exposed as a
 * `signal<T[]>([...])`. The downstream `mockup_cleaner` stage clears these to
 * empty signals and `service_agent` wires them to the real API client — so all
 * seed data MUST live inside these signal wrappers.
 */
@Injectable({ providedIn: 'root' })
export class DataService {
  readonly users = signal<User[]>([
    { id: 'u1', email: 'ada@acme.io', name: 'Ada Lovelace', role: 'ADMIN', createdAt: '2026-06-01T09:00:00Z' },
    { id: 'u2', email: 'grace@acme.io', name: 'Grace Hopper', role: 'MEMBER', createdAt: '2026-06-02T09:00:00Z' },
    { id: 'u3', email: 'linus@acme.io', name: 'Linus Torvalds', role: 'MEMBER', createdAt: '2026-06-03T09:00:00Z' },
    { id: 'u4', email: 'margaret@acme.io', name: 'Margaret Hamilton', role: 'MEMBER', createdAt: '2026-06-05T09:00:00Z' },
  ]);

  readonly projects = signal<Project[]>([
    {
      id: 'p1',
      name: 'Payments Platform',
      description: 'Core billing, invoicing and subscription services.',
      createdBy: 'u1',
      createdAt: '2026-06-10T09:00:00Z',
      memberIds: ['u1', 'u2', 'u3'],
      openIssueCount: 3,
    },
    {
      id: 'p2',
      name: 'Mobile App',
      description: 'iOS and Android client for the customer portal.',
      createdBy: 'u1',
      createdAt: '2026-06-12T09:00:00Z',
      memberIds: ['u1', 'u2', 'u4'],
      openIssueCount: 2,
    },
    {
      id: 'p3',
      name: 'Data Warehouse',
      description: 'Analytics pipeline and reporting infrastructure.',
      createdBy: 'u1',
      createdAt: '2026-06-15T09:00:00Z',
      memberIds: ['u1', 'u3'],
      openIssueCount: 1,
    },
  ]);

  readonly issues = signal<Issue[]>([
    {
      id: 'i1', projectId: 'p1', projectName: 'Payments Platform',
      title: 'Refund webhook retries indefinitely',
      description: 'When a refund fails downstream, the webhook consumer keeps retrying without a backoff cap, flooding the queue.',
      priority: 'HIGH', status: 'IN_PROGRESS', assigneeId: 'u2', assigneeName: 'Grace Hopper',
      createdBy: 'u1', createdByName: 'Ada Lovelace',
      createdAt: '2026-07-10T10:00:00Z', updatedAt: '2026-07-17T14:30:00Z',
    },
    {
      id: 'i2', projectId: 'p1', projectName: 'Payments Platform',
      title: 'Invoice PDF totals rounding error',
      description: 'Line-item totals are rounded per-row instead of on the sum, causing off-by-one-cent discrepancies.',
      priority: 'MEDIUM', status: 'OPEN', assigneeId: null, assigneeName: null,
      createdBy: 'u3', createdByName: 'Linus Torvalds',
      createdAt: '2026-07-12T11:00:00Z', updatedAt: '2026-07-12T11:00:00Z',
    },
    {
      id: 'i3', projectId: 'p1', projectName: 'Payments Platform',
      title: 'Add proration support to plan upgrades',
      description: 'Mid-cycle upgrades should prorate the difference rather than charging the full new plan price.',
      priority: 'LOW', status: 'OPEN', assigneeId: 'u3', assigneeName: 'Linus Torvalds',
      createdBy: 'u1', createdByName: 'Ada Lovelace',
      createdAt: '2026-07-14T08:20:00Z', updatedAt: '2026-07-15T09:10:00Z',
    },
    {
      id: 'i4', projectId: 'p2', projectName: 'Mobile App',
      title: 'Push notifications not delivered on Android 14',
      description: 'Foreground service restrictions in Android 14 are dropping our notification channel silently.',
      priority: 'HIGH', status: 'OPEN', assigneeId: 'u4', assigneeName: 'Margaret Hamilton',
      createdBy: 'u2', createdByName: 'Grace Hopper',
      createdAt: '2026-07-11T13:00:00Z', updatedAt: '2026-07-16T10:00:00Z',
    },
    {
      id: 'i5', projectId: 'p2', projectName: 'Mobile App',
      title: 'Dark mode contrast fails on settings screen',
      description: 'Secondary text fails WCAG AA against the dark surface. Update the token mapping.',
      priority: 'MEDIUM', status: 'RESOLVED', assigneeId: 'u2', assigneeName: 'Grace Hopper',
      createdBy: 'u4', createdByName: 'Margaret Hamilton',
      createdAt: '2026-07-05T09:00:00Z', updatedAt: '2026-07-09T16:00:00Z',
    },
    {
      id: 'i6', projectId: 'p3', projectName: 'Data Warehouse',
      title: 'Nightly ETL job exceeds memory limit',
      description: 'The aggregation step loads the full fact table into memory; needs a streaming/windowed rewrite.',
      priority: 'HIGH', status: 'OPEN', assigneeId: null, assigneeName: null,
      createdBy: 'u3', createdByName: 'Linus Torvalds',
      createdAt: '2026-07-13T07:00:00Z', updatedAt: '2026-07-13T07:00:00Z',
    },
  ]);

  readonly comments = signal<Comment[]>([
    {
      id: 'c1', issueId: 'i1', authorId: 'u1', authorName: 'Ada Lovelace', parentId: null,
      body: 'This is causing on-call pages every night. Bumping to high priority.',
      createdAt: '2026-07-15T09:30:00Z',
      replies: [
        {
          id: 'c2', issueId: 'i1', authorId: 'u2', authorName: 'Grace Hopper', parentId: 'c1',
          body: 'Agreed. I have a fix in progress that adds an exponential backoff with a max of 5 retries.',
          createdAt: '2026-07-15T10:05:00Z', replies: [],
        },
      ],
    },
    {
      id: 'c3', issueId: 'i1', authorId: 'u3', authorName: 'Linus Torvalds', parentId: null,
      body: 'Make sure we emit a metric when we hit the retry cap so we can alert on it.',
      createdAt: '2026-07-16T11:00:00Z', replies: [],
    },
  ]);

  readonly settings = signal<ServiceSetting[]>([
    {
      service: 'postgresql', label: 'PostgreSQL', configured: true,
      keys: [
        { key: 'POSTGRES_HOST', label: 'Host', maskedValue: 'db.internal.•••••' },
        { key: 'POSTGRES_USER', label: 'User', maskedValue: 'issuetracker' },
        { key: 'POSTGRES_PASSWORD', label: 'Password', maskedValue: '••••••••••' },
      ],
    },
    {
      service: 'minio', label: 'MinIO Object Storage', configured: false,
      keys: [
        { key: 'MINIO_ENDPOINT', label: 'Endpoint', maskedValue: '' },
        { key: 'MINIO_ACCESS_KEY', label: 'Access Key', maskedValue: '' },
        { key: 'MINIO_SECRET_KEY', label: 'Secret Key', maskedValue: '' },
      ],
    },
  ]);

  // ---- Derived selectors ----
  projectById(id: string): Project | undefined {
    return this.projects().find((p) => p.id === id);
  }

  issuesForProject = (projectId: string) =>
    computed(() => this.issues().filter((i) => i.projectId === projectId));

  issueById(id: string): Issue | undefined {
    return this.issues().find((i) => i.id === id);
  }

  membersForProject(projectId: string): User[] {
    const project = this.projectById(projectId);
    if (!project) return [];
    return this.users().filter((u) => project.memberIds.includes(u.id));
  }

  commentsForIssue = (issueId: string) =>
    computed(() => this.comments().filter((c) => c.issueId === issueId));

  userById(id: string | null): User | undefined {
    if (!id) return undefined;
    return this.users().find((u) => u.id === id);
  }
}
