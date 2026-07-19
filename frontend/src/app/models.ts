export type Role = 'ADMIN' | 'MEMBER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: string;
  memberIds: string[];
  openIssueCount: number;
}

export interface Issue {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  priority: Priority;
  status: IssueStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  authorName: string;
  parentId: string | null;
  body: string;
  createdAt: string;
  replies: Comment[];
}

export interface ServiceSetting {
  service: string;
  label: string;
  configured: boolean;
  keys: { key: string; label: string; maskedValue: string }[];
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
};

export const STATUS_ORDER: IssueStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED'];
export const PRIORITY_ORDER: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];

/** Maps a status/priority to the CSS modifier class used by badges. */
export function statusClass(status: IssueStatus): string {
  return 'badge-status-' + status.toLowerCase().replace('_', '-');
}

export function priorityClass(priority: Priority): string {
  return 'badge-priority-' + priority.toLowerCase();
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
