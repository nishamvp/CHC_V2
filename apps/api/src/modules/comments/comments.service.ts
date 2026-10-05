import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateCommentDto } from '@repo/shared';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    authorId: string,
    data: CreateCommentDto,
  ) {
    const request = await this.prisma.request.findFirst({
      where: { id: data.requestId, organizationId },
    });
    if (!request) {
      throw new NotFoundException('Request not found');
    }

    return this.prisma.comment.create({
      data: { ...data, organizationId, authorId },
    });
  }

  async findByRequest(organizationId: string, requestId: string) {
    return this.prisma.comment.findMany({
      where: { requestId, organizationId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
