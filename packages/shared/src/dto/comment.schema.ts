import { z } from "zod";

export const createCommentSchema = z.object({
  requestId: z.string().uuid(),
  body: z.string().min(1),
  visibility: z.enum(["ALL", "DEPT_ONLY"]).default("ALL"),
});
export type CreateCommentDto = z.infer<typeof createCommentSchema>;
