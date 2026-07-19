import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Project } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/jwt-auth.guard';
import { serializeProject, serializeUser } from '../common/serializers';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(user: AuthUser): boolean {
    return user.role === 'ADMIN';
  }

  /** Throws 404 if the project is missing. */
  async getProjectOrThrow(projectId: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  /**
   * Ensures the caller may access the project: ADMINs always may; MEMBERs only
   * if they belong to it. Throws 404 for a missing project, 403 for a
   * non-member. Reused by the issues and comments services.
   */
  async assertProjectAccess(projectId: string, user: AuthUser): Promise<Project> {
    const project = await this.getProjectOrThrow(projectId);
    if (this.isAdmin(user)) return project;
    const membership = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: user.userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Not a member of this project');
    }
    return project;
  }

  async findAllForUser(user: AuthUser) {
    const where = this.isAdmin(user)
      ? {}
      : { members: { some: { userId: user.userId } } };
    const projects = await this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        members: true,
        issues: { where: { status: 'OPEN' }, select: { id: true } },
      },
    });
    return projects.map((p) => serializeProject(p, p.issues.length));
  }

  async createProject(user: AuthUser, name: string, description?: string) {
    const project = await this.prisma.project.create({
      data: {
        name,
        description: description ?? null,
        createdById: user.userId,
        // The creating admin is implicitly a member of their own project.
        members: { create: { userId: user.userId } },
      },
      include: { members: true, issues: { select: { id: true, status: true } } },
    });
    return serializeProject(project, 0);
  }

  async findOne(projectId: string, user: AuthUser) {
    await this.assertProjectAccess(projectId, user);
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
        issues: { where: { status: 'OPEN' }, select: { id: true } },
      },
    });
    return serializeProject(project!, project!.issues.length);
  }

  async getMembers(projectId: string, user: AuthUser) {
    await this.assertProjectAccess(projectId, user);
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => serializeUser(m.user));
  }

  /** ADMIN-only. Idempotent: adding an existing member is a no-op, not a 500. */
  async addMember(projectId: string, userId: string) {
    await this.getProjectOrThrow(projectId);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    await this.prisma.projectMember.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId },
      update: {},
    });
    return this.getMembersRaw(projectId);
  }

  private async getMembersRaw(projectId: string) {
    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return members.map((m) => serializeUser(m.user));
  }

  /** True if `userId` is a member of `projectId`. */
  async isMember(projectId: string, userId: string): Promise<boolean> {
    const m = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });
    return m !== null;
  }
}
