import { Comment, Issue, Project, ProjectMember, User } from '@prisma/client';

/**
 * The Prisma `Role` enum is `USER | ADMIN`, but the product contract (and the
 * approved Angular frontend `models.ts`) speaks `MEMBER | ADMIN`. These helpers
 * translate at the API boundary so the persisted enum stays canonical while the
 * wire format matches what the client expects.
 */
export type ApiRole = 'ADMIN' | 'MEMBER';

export function toApiRole(role: string): ApiRole {
  return role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
}

export function toDbRole(role: string): 'ADMIN' | 'USER' {
  return role === 'ADMIN' ? 'ADMIN' : 'USER';
}

export interface UserDto {
  id: string;
  email: string;
  name: string | null;
  role: ApiRole;
  createdAt: Date;
}

/** Never leak the password hash. */
export function serializeUser(u: User): UserDto {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: toApiRole(u.role),
    createdAt: u.createdAt,
  };
}

type ProjectWithRelations = Project & {
  members?: ProjectMember[];
  _count?: { issues?: number };
  // Callers may pass fully-hydrated issues or a narrow `select` (id/status only),
  // so require just the fields serializeProject actually reads.
  issues?: Array<Pick<Issue, 'id'> & Partial<Pick<Issue, 'status'>>>;
};

export function serializeProject(p: ProjectWithRelations, openIssueCount?: number) {
  const memberIds = (p.members ?? []).map((m) => m.userId);
  const openCount =
    openIssueCount ??
    (p.issues ? p.issues.filter((i) => i.status === 'OPEN').length : 0);
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    createdBy: p.createdById,
    createdById: p.createdById,
    createdAt: p.createdAt,
    memberIds,
    openIssueCount: openCount,
  };
}

type IssueWithRelations = Issue & {
  project?: Project | null;
  assignee?: User | null;
  createdBy?: User | null;
};

/**
 * Emits both camelCase (frontend contract) and snake_case (direct API probes in
 * the test-spec reference `assignee_id`, `created_by`) so either consumer works.
 */
export function serializeIssue(i: IssueWithRelations) {
  return {
    id: i.id,
    projectId: i.projectId,
    projectName: i.project?.name ?? null,
    title: i.title,
    description: i.description ?? '',
    priority: i.priority,
    status: i.status,
    assigneeId: i.assigneeId,
    assignee_id: i.assigneeId,
    assigneeName: i.assignee?.name ?? null,
    createdBy: i.createdById,
    created_by: i.createdById,
    createdById: i.createdById,
    createdByName: i.createdBy?.name ?? null,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  };
}

type CommentWithAuthor = Comment & { author?: User | null };
export interface CommentDto {
  id: string;
  issueId: string;
  authorId: string;
  author_id: string;
  authorName: string | null;
  parentId: string | null;
  parent_id: string | null;
  body: string;
  createdAt: Date;
  replies: CommentDto[];
}

function serializeCommentNode(c: CommentWithAuthor): CommentDto {
  return {
    id: c.id,
    issueId: c.issueId,
    authorId: c.authorId,
    author_id: c.authorId,
    authorName: c.author?.name ?? null,
    parentId: c.parentId,
    parent_id: c.parentId,
    body: c.body,
    createdAt: c.createdAt,
    replies: [],
  };
}

/**
 * Builds a one-level-deep thread: top-level comments in chronological order,
 * each with its replies grouped underneath. Replies-to-replies are flattened up
 * to their nearest top-level ancestor (spec: one visible level of threading).
 */
export function buildCommentTree(comments: CommentWithAuthor[]): CommentDto[] {
  const byId = new Map<string, CommentDto>();
  const ordered = [...comments].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  for (const c of ordered) byId.set(c.id, serializeCommentNode(c));

  const roots: CommentDto[] = [];
  for (const c of ordered) {
    const node = byId.get(c.id)!;
    if (!c.parentId) {
      roots.push(node);
      continue;
    }
    // Walk up to the top-level ancestor so nesting never exceeds one level.
    let ancestorId: string | null = c.parentId;
    let guard = 0;
    while (ancestorId && guard < 100) {
      const parent = ordered.find((p) => p.id === ancestorId);
      if (!parent || !parent.parentId) break;
      ancestorId = parent.parentId;
      guard += 1;
    }
    const root = ancestorId ? byId.get(ancestorId) : undefined;
    if (root) root.replies.push(node);
    else roots.push(node);
  }
  return roots;
}
