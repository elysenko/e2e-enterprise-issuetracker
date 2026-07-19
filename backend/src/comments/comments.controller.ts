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
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';

// Accept both parentId and parent_id.
const createCommentSchema = z
  .object({
    body: z.string().min(1),
    parentId: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
  })
  .transform((v) => ({
    body: v.body,
    parentId: v.parentId !== undefined ? v.parentId : v.parent_id,
  }));

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues/:id/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Param('id') issueId: string) {
    return this.commentsService.list(issueId, user);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Param('id') issueId: string,
    @Body() body: unknown,
  ) {
    const input = parseOrThrow(createCommentSchema, body);
    return this.commentsService.create(
      issueId,
      user,
      input.body,
      input.parentId,
    );
  }
}
