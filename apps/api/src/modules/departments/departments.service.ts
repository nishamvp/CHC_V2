import { PrismaService } from 'src/database/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AddDepartmentMemberDto,
  UpdateMemberPositionDto,
} from '@repo/shared';
import { Prisma } from '@prisma/client';
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
  // One department's membership changes now run one at a time
  private async lockDepartment(
    tx: Prisma.TransactionClient,
    departmentId: string,
  ) {
    await tx.$queryRaw`SELECT "id" FROM "departments" WHERE "id" = ${departmentId} FOR UPDATE`;
  }

  private findHead(
    tx: Prisma.TransactionClient,
    organizationId: string,
    departmentId: string,
    subDepartmentId: string | null,
    excludeMembershipId?: string,
  ) {
    return tx.departmentMembership.findFirst({
      where: {
        organizationId,
        departmentId,
        subDepartmentId,
        position: 'HOS',
        ...(excludeMembershipId ? { NOT: { id: excludeMembershipId } } : {}),
      },
      include: { user: { select: { username: true } } },
    });
  }

  async addMember(
    organizationId: string,
    departmentId: string,
    data: AddDepartmentMemberDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const department = await tx.department.findFirst({
        where: { id: departmentId, organizationId },
      });
      if (!department) throw new NotFoundException('Department not found');

      await this.lockDepartment(tx, departmentId);

      const user = await tx.user.findFirst({
        where: { id: data.userId, organizationId, isActive: true },
      });
      if (!user) throw new NotFoundException('User not found');

      if (data.subDepartmentId) {
        const sub = await tx.subDepartment.findFirst({
          where: { id: data.subDepartmentId, departmentId, organizationId },
        });
        if (!sub)
          throw new NotFoundException(
            'Subdepartment does not belong to this department',
          );
      }

      const scope = data.subDepartmentId ?? null;

      const existing = await tx.departmentMembership.findFirst({
        where: {
          userId: data.userId,
          departmentId,
          organizationId,
          subDepartmentId: scope,
        },
      });
      if (existing) {
        throw new ConflictException(
          'This user is already a member here. To change their position, update the existing membership.',
        );
      }

      if (data.position === 'HOS') {
        const head = await this.findHead(
          tx,
          organizationId,
          departmentId,
          scope,
        );
        if (head) {
          throw new ConflictException(
            `This ${scope ? 'subdepartment' : 'department'} already has a head: ${head.user.username}`,
          );
        }
      }

      return tx.departmentMembership.create({
        data: {
          organizationId,
          departmentId,
          userId: data.userId,
          subDepartmentId: data.subDepartmentId,
          position: data.position,
        },
      });
    });
  }

  async listMembers(organizationId: string, departmentId: string) {
    const department = await this.prisma.department.findFirst({
      where: { id: departmentId, organizationId },
    });
    if (!department) throw new NotFoundException('Department not found');

    return this.prisma.departmentMembership.findMany({
      where: { departmentId, organizationId },
      select: {
        id: true,
        position: true,
        subDepartmentId: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, email: true, isActive: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMemberPosition(
    organizationId: string,
    departmentId: string,
    membershipId: string,
    data: UpdateMemberPositionDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lockDepartment(tx, departmentId);

      const membership = await tx.departmentMembership.findFirst({
        where: { id: membershipId, departmentId, organizationId },
      });
      if (!membership) throw new NotFoundException('Membership not found');

      if (membership.position === data.position) return membership; // nothing to change

      if (data.position === 'HOS') {
        const head = await this.findHead(
          tx,
          organizationId,
          departmentId,
          membership.subDepartmentId,
          membershipId,
        );
        if (head) {
          if (!data.replaceCurrentHead) {
            throw new ConflictException(
              `${head.user.username} is already the head here. Send "replaceCurrentHead": true to make them regular staff and promote this member.`,
            );
          }
          await tx.departmentMembership.update({
            where: { id: head.id },
            data: { position: 'STAFF' },
          });
        }
      }

      return tx.departmentMembership.update({
        where: { id: membershipId },
        data: { position: data.position },
      });
    });
  }
}
