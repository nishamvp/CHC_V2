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
export const updateMemberPositionSchema = z.object({
  position: z.enum(["HOS", "STAFF"]),
  replaceCurrentHead: z.boolean().optional(),
});
export type UpdateMemberPositionDto = z.infer<
  typeof updateMemberPositionSchema
>;
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
export type AddDepartmentMemberDto = z.infer<typeof addDepartmentMemberSchema>;
