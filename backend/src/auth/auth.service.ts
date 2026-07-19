import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUser, UserDto } from '../common/serializers';

export interface AuthResult {
  token: string;
  user: UserDto;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private sign(user: User): string {
    return this.jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
  }

  async signup(email: string, password: string, name: string): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    // First registered user becomes ADMIN; everyone after is a MEMBER (USER).
    const userCount = await this.prisma.user.count();
    const role: Role = userCount === 0 ? Role.ADMIN : Role.USER;

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: passwordHash, name, role },
    });

    return { token: this.sign(user), user: serializeUser(user) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Same error for unknown email and wrong password — never reveal which.
    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return { token: this.sign(user), user: serializeUser(user) };
  }

  async me(userId: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    return serializeUser(user);
  }
}
