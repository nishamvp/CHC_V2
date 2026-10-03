import { Injectable, ConflictException } from '@nestjs/common';
import { CreateCustomerDto } from '@repo/shared';
import { PrismaService } from '../../database/prisma.service';
import { normalizePhoneE164 } from '../../common/utils/phone.util';
import { Prisma } from '@prisma/client';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, data: CreateCustomerDto) {
    const normalizedPhone = normalizePhoneE164(data.phone);
    try {
      return await this.prisma.customer.create({
        data: { ...data, phone: normalizedPhone, organizationId },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException(
          'A customer with this phone number already exists',
        );
      }
      throw err;
    }
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
