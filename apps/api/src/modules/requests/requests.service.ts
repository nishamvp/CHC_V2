import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RequestStatus } from '@prisma/client';
import { CreateRequestDto } from '@repo/shared';
import { PrismaService } from '../../database/prisma.service';
import { ALLOWED_TRANSITIONS } from './request-workflow';


@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    organizationId: string,
    createdById: string,
    data: CreateRequestDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Confirm submitted records belong to this organization.
      const customer = await tx.customer.findFirst({
        where: { id: data.customerId, organizationId },
      });

      if (!customer) {
        throw new NotFoundException('Customer not found');
      }

      const department = await tx.department.findFirst({
        where: { id: data.departmentId, organizationId },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }

      if (data.subDepartmentId) {
        const subDepartment = await tx.subDepartment.findFirst({
          where: {
            id: data.subDepartmentId,
            departmentId: data.departmentId,
            organizationId,
          },
        });

        if (!subDepartment) {
          throw new NotFoundException(
            'Subdepartment does not belong to the selected department',
          );
        }
      }

      const year = new Date().getUTCFullYear();

      // Create this organization's sequence row for the year if it does not exist.
      await tx.$executeRaw`
        INSERT INTO request_number_sequences
          ("organizationId", "year", "lastNumber", "updatedAt")
        VALUES
          (${organizationId}, ${year}, 0, NOW())
        ON CONFLICT ("organizationId", "year") DO NOTHING
      `;

      // Atomic database increment: safe even when two users create requests together.
      const sequenceRows = await tx.$queryRaw<{ lastNumber: number }[]>`
        UPDATE request_number_sequences
        SET "lastNumber" = "lastNumber" + 1,
            "updatedAt" = NOW()
        WHERE "organizationId" = ${organizationId}
          AND "year" = ${year}
        RETURNING "lastNumber"
      `;

      const nextNumber = sequenceRows[0].lastNumber;
      const requestNo = `CHC-${year}-${nextNumber.toString().padStart(5, '0')}`;

      const request = await tx.request.create({
        data: {
          ...data,
          organizationId,
          createdById,
          requestNo,
          status: 'NEW',
        },
      });

      await tx.requestEvent.create({
        data: {
          requestId: request.id,
          actorId: createdById,
          fromStatus: null,
          toStatus: 'NEW',
          note: 'Request created',
        },
      });

      return request;
    });
  }
  async transition(
    organizationId: string,
    requestId: string,
    actorId: string,
    toStatus: RequestStatus,
    note?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const request = await tx.request.findFirst({
        where: {
          id: requestId,
          organizationId,
        },
      });

      if (!request) {
        throw new NotFoundException('Request not found');
      }

      const allowedStatuses = ALLOWED_TRANSITIONS[request.status];

      if (!allowedStatuses.includes(toStatus)) {
        throw new BadRequestException(
          `Cannot move from ${request.status} to ${toStatus}`,
        );
      }

      // Status condition prevents two simultaneous actions from overwriting each other.
      const result = await tx.request.updateMany({
        where: {
          id: requestId,
          organizationId,
          status: request.status,
        },
        data: {
          status: toStatus,
        },
      });

      if (result.count !== 1) {
        throw new ConflictException(
          'This request was updated by another user. Refresh and try again.',
        );
      }

      const updatedRequest = await tx.request.findUniqueOrThrow({
        where: { id: requestId },
      });

      await tx.requestEvent.create({
        data: {
          requestId,
          actorId,
          fromStatus: request.status,
          toStatus,
          note,
        },
      });

      return updatedRequest;
    });
  }
}
