import { z } from 'zod';

export const createCustomerSchema = z.object({
  phone: z.string().min(1),
  name: z.string().min(1),
  nameAr: z.string().optional(),
  region: z.string().optional(),
  placeNumber: z.string().optional(),
  emiratesId: z.string().optional(),
  email: z.string().email().optional(),
  createdVia: z.enum(['WALKIN', 'CALL', 'APP']),
});

export type CreateCustomerDto = z.infer<typeof createCustomerSchema>;