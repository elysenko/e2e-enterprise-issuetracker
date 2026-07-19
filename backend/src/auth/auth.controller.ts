import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { parseOrThrow } from '../common/validation';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { AuthUser, JwtAuthGuard } from './jwt-auth.guard';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: unknown) {
    const { email, password, name } = parseOrThrow(signupSchema, body);
    return this.authService.signup(email, password, name);
  }

  @Post('login')
  login(@Body() body: unknown) {
    const { email, password } = parseOrThrow(loginSchema, body);
    return this.authService.login(email, password);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.authService.me(user.userId);
  }
}
