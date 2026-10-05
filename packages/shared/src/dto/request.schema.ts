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
  expiryDate: z.string().datetime().optional(),
});
export const requestStatusSchema = z.enum([
  "NEW",
  "PENDING_ASSIGNMENT",
  "IN_PROGRESS",
  "HOS_HANDLING",
  "PENDING_HOS_REVIEW",
  "REJECTED_BY_HOS",
  "REPLIED_TO_CHC",
  "COMPLETED",
  "REOPENED",
  "REJECTED",
  "CLOSED",
]);

export const transitionSchema = z.object({
  toStatus: requestStatusSchema,
  note: z.string().optional(),
});
export const assignStaffSchema = z.object({
  staffId: z.string().uuid(),
});
export type CreateRequestDto = z.infer<typeof createRequestSchema>;
export type TransitionDto = z.infer<typeof transitionSchema>;
export type AssignStaffDto = z.infer<typeof assignStaffSchema>;
