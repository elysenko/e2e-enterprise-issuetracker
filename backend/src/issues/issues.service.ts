import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IssueStatus, Prisma, Priority } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { serializeIssue } from '../common/serializers';

const ISSUE_INCLUDE = {
  project: true,
  assignee: true,
  createdBy: true,
} satisfies Prisma.IssueInclude;

export interface CreateIssueInput {
  title: string;
  description?: string;
  priority?: Priority;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  priority?: Priority;
  status?: IssueStatus;
  assigneeId?: string | null;
}

@Injectable()
export class IssuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  async listForProject(projectId: string, user: AuthUser, status?: IssueStatus) {
    await this.projects.assertProjectAccess(projectId, user);
    const issues = await this.prisma.issue.findMany({
      where: { projectId, ...(status ? { status } : {}) },
      include: ISSUE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return issues.map(serializeIssue);
  }

  async create(projectId: string, user: AuthUser, input: CreateIssueInput) {
    await this.projects.assertProjectAccess(projectId, user);
    const issue = await this.prisma.issue.create({
      data: {
        projectId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? Priority.MEDIUM,
        status: IssueStatus.OPEN,
        createdById: user.userId,
      },
      include: ISSUE_INCLUDE,
    });
    return serializeIssue(issue);
  }

  private async getIssueWithProject(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: ISSUE_INCLUDE,
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  async findOne(issueId: string, user: AuthUser) {
    const issue = await this.getIssueWithProject(issueId);
    await this.projects.assertProjectAccess(issue.projectId, user);
    return serializeIssue(issue);
  }

  async update(issueId: string, user: AuthUser, input: UpdateIssueInput) {
    const issue = await this.getIssueWithProject(issueId);
    await this.projects.assertProjectAccess(issue.projectId, user);

    const data: Prisma.IssueUpdateInput = {};

    if (input.title !== undefined) {
      if (input.title.trim().length === 0) {
        throw new BadRequestException('Title cannot be empty');
      }
      data.title = input.title;
    }
    if (input.description !== undefined) data.description = input.description;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.status !== undefined) data.status = input.status;

    if (input.assigneeId !== undefined) {
      if (input.assigneeId === null) {
        data.assignee = { disconnect: true };
      } else {
        const isMember = await this.projects.isMember(
          issue.projectId,
          input.assigneeId,
        );
        if (!isMember) {
          throw new BadRequestException(
            'Assignee must be a member of the project',
          );
        }
        data.assignee = { connect: { id: input.assigneeId } };
      }
    }

    const updated = await this.prisma.issue.update({
      where: { id: issueId },
      data,
      include: ISSUE_INCLUDE,
    });
    return serializeIssue(updated);
  }

  /** Issues across every project the caller can see (ADMIN → all). */
  async dashboard(user: AuthUser) {
    const where: Prisma.IssueWhereInput =
      user.role === 'ADMIN'
        ? {}
        : { project: { members: { some: { userId: user.userId } } } };
    const issues = await this.prisma.issue.findMany({
      where,
      include: ISSUE_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return issues.map(serializeIssue);
  }
}
