import { PrismaService } from 'src/database/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AddDepartmentMemberDto } from '@repo/shared';
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
  async addMember(
    organizationId: string,
    departmentId: string,
    data: AddDepartmentMemberDto,
  ) {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!department) throw new NotFoundException('Department not found');

    const user = await this.prisma.user.findFirst({
      where: { id: data.userId, organizationId, isActive: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (data.subDepartmentId) {
      const sub = await this.prisma.subDepartment.findFirst({
        where: { id: data.subDepartmentId, departmentId, organizationId },
      });
      if (!sub)
        throw new NotFoundException(
          'Subdepartment does not belong to this department',
        );
    }

    // The database unique rule can't catch duplicates when subDepartmentId is NULL
    // (the Day 4 gotcha), so we check here.
    const existing = await this.prisma.departmentMembership.findFirst({
      where: {
        userId: data.userId,
        departmentId,
        subDepartmentId: data.subDepartmentId ?? null,
      },
    });
    if (existing)
      throw new ConflictException('This user is already a member here');

    return this.prisma.departmentMembership.create({
      data: {
        organizationId,
        departmentId,
        userId: data.userId,
        subDepartmentId: data.subDepartmentId,
        position: data.position,
      },
    });
  }
}
