import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// Reusable: find a request in this organization, or throw 404
export async function findRequestOrThrow(
  organizationId: string,
  requestId: string,
  client: Prisma.TransactionClient = this.prisma,
) {
  const request = await client.request.findFirst({
    where: { id: requestId, organizationId },
  });
  if (!request) {
    throw new NotFoundException('Request not found');
  }
  return request;
}
