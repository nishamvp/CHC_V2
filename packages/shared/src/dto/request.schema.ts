import { z } from "zod";

export const requestChannelSchema = z.enum([
  "WALKIN",
  "CALL",
  "APP",
  "INTERNAL",
]);

export const createRequestSchema = z.object({
  customerId: z.string().uuid(),
  departmentId: z.string().uuid(),
  subDepartmentId: z.string().uuid().optional(),
  typeOfRequest: z.string().min(1),
  notes: z.string().min(1),
  channel: requestChannelSchema,
  expiryDate: z.coerce.date().optional(),
});

export type CreateRequestDto = z.infer<typeof createRequestSchema>;
