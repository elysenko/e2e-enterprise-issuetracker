import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { parseOrThrow } from '../common/validation';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssuesService } from './issues.service';

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const statusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']);

const createIssueSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: priorityEnum.optional(),
});

// Accepts both snake_case (assignee_id) and camelCase (assigneeId).
const updateIssueSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    priority: priorityEnum.optional(),
    status: statusEnum.optional(),
    assigneeId: z.string().nullable().optional(),
    assignee_id: z.string().nullable().optional(),
  })
  .transform((v) => ({
    title: v.title,
    description: v.description,
    priority: v.priority,
    status: v.status,
    assigneeId: v.assigneeId !== undefined ? v.assigneeId : v.assignee_id,
  }));

@ApiTags('issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Get('projects/:projectId/issues')
  listForProject(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query('status') status?: string,
  ) {
    const parsedStatus = status
      ? parseOrThrow(statusEnum, status)
      : undefined;
    return this.issuesService.listForProject(projectId, user, parsedStatus);
  }

  @Post('projects/:projectId/issues')
  create(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() body: unknown,
  ) {
    const input = parseOrThrow(createIssueSchema, body);
    return this.issuesService.create(projectId, user, input);
  }

  @Get('dashboard/issues')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.issuesService.dashboard(user);
  }

  @Get('issues/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.issuesService.findOne(id, user);
  }

  @Patch('issues/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const input = parseOrThrow(updateIssueSchema, body);
    return this.issuesService.update(id, user, input);
  }
}
