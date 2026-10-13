import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { CreateUserDto } from '@repo/shared';
import { PrismaService } from '../../database/prisma.service';

// Never send passwordHash back to the client
const SAFE_USER_FIELDS = {
  id: true,
  organizationId: true,
  username: true,
  email: true,
  isActive: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, data: CreateUserDto) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    try {
      return await this.prisma.user.create({
        data: {
          organizationId,
          username: data.username,
          email: data.email.trim().toLowerCase(),
          passwordHash,
        },
        select: SAFE_USER_FIELDS,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Username or email already in use');
      }
      throw err;
    }
  }

  findAllForOrg(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: SAFE_USER_FIELDS,
      orderBy: { createdAt: 'asc' },
    });
  }
}
