import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { parseOrThrow } from '../common/validation';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  userId: z.string().min(1),
});

@ApiTags('projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.projectsService.findAllForUser(user);
  }

  @UseGuards(AdminGuard)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: unknown) {
    const { name, description } = parseOrThrow(createProjectSchema, body);
    return this.projectsService.createProject(user, name, description);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.findOne(id, user);
  }

  @Get(':id/members')
  getMembers(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.projectsService.getMembers(id, user);
  }

  @UseGuards(AdminGuard)
  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() body: unknown) {
    const { userId } = parseOrThrow(addMemberSchema, body);
    return this.projectsService.addMember(id, userId);
  }
}
