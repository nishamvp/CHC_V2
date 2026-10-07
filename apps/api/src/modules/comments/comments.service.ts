import { Injectable } from '@nestjs/common';
import type { CreateCommentDto } from '@repo/shared';
import { PrismaService } from '../../database/prisma.service';
import { findRequestOrThrow } from '../requests/request.helper';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    authorId: string,
    data: CreateCommentDto,
  ) {
    await findRequestOrThrow(organizationId, data.requestId, this.prisma);
    return this.prisma.comment.create({
      data: { ...data, organizationId, authorId },
    });
  }

  async findByRequest(organizationId: string, requestId: string) {
    await findRequestOrThrow(organizationId, requestId, this.prisma);
    return this.prisma.comment.findMany({
      where: { organizationId, requestId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
