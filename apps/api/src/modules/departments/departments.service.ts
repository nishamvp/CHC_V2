import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(organizationId: string, name: string, nameAr?: string) {
    return this.prisma.department.create({
      data: { organizationId, name, nameAr },
    });
  }
  async findAllForOrg(organizationId: string) {
    return this.prisma.department.findMany({
      where: { organizationId },
    });
  }
}
