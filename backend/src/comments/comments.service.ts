import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt-auth.guard';
import { ProjectsService } from '../projects/projects.service';
import { buildCommentTree, serializeUser } from '../common/serializers';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  private async getIssueOrThrow(issueId: string) {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true, projectId: true },
    });
    if (!issue) throw new NotFoundException('Issue not found');
    return issue;
  }

  async list(issueId: string, user: AuthUser) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.projects.assertProjectAccess(issue.projectId, user);
    const comments = await this.prisma.comment.findMany({
      where: { issueId },
      include: { author: true },
      orderBy: { createdAt: 'asc' },
    });
    return buildCommentTree(comments);
  }

  async create(
    issueId: string,
    user: AuthUser,
    body: string,
    parentId?: string | null,
  ) {
    const issue = await this.getIssueOrThrow(issueId);
    await this.projects.assertProjectAccess(issue.projectId, user);

    if (!body || body.trim().length === 0) {
      throw new BadRequestException('Comment body cannot be empty');
    }

    if (parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: parentId },
        select: { id: true, issueId: true },
      });
      if (!parent || parent.issueId !== issueId) {
        throw new BadRequestException('Parent comment not found on this issue');
      }
    }

    const created = await this.prisma.comment.create({
      data: {
        issueId,
        authorId: user.userId,
        parentId: parentId ?? null,
        body,
      },
      include: { author: true },
    });

    return {
      id: created.id,
      issueId: created.issueId,
      authorId: created.authorId,
      author_id: created.authorId,
      authorName: created.author?.name ?? null,
      author: created.author ? serializeUser(created.author) : null,
      parentId: created.parentId,
      parent_id: created.parentId,
      body: created.body,
      createdAt: created.createdAt,
      replies: [],
    };
  }
}
