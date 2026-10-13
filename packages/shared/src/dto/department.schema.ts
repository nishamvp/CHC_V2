import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
});
export const addDepartmentMemberSchema = z.object({
  userId: z.string().uuid(),
  position: z.enum(["HOS", "STAFF"]),
  subDepartmentId: z.string().uuid().optional(),
});
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export type AddDepartmentMemberDto = z.infer<typeof addDepartmentMemberSchema>;
