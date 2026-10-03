import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
});
export type CreateDepartmentDto = z.infer<typeof createDepartmentSchema>;
