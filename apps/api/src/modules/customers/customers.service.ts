import { Injectable } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import { createCustomerSchema } from '@repo/shared';
import { PrismaService } from '../../database/prisma.service';
import { normalizePhoneE164 } from '../../common/utils/phone.util';

class CreateCustomerDto extends createZodDto(createCustomerSchema) {}
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, data: CreateCustomerDto) {
    const normalizedPhone = normalizePhoneE164(data.phone);
    return this.prisma.customer.create({
      data: { ...data, phone: normalizedPhone, organizationId },
    });
  }

  async findByPhone(organizationId: string, phone: string) {
    const normalizedPhone = normalizePhoneE164(phone);
    return this.prisma.customer.findUnique({
      where: {
        organizationId_phone: { organizationId, phone: normalizedPhone },
      },
    });
  }

  async findAllForOrg(organizationId: string) {
    return this.prisma.customer.findMany({ where: { organizationId } });
  }
}
