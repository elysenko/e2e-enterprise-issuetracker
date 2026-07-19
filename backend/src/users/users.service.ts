import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { serializeUser, toDbRole, UserDto } from '../common/serializers';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(serializeUser);
  }

  async findById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return serializeUser(user);
  }

  /** ADMIN-only role management. Accepts the API role (`ADMIN | MEMBER`). */
  async updateRole(id: string, apiRole: string): Promise<UserDto> {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: toDbRole(apiRole) as Role },
    });
    return serializeUser(user);
  }
}
