import { z } from 'zod';

export const refreshSchema = z.object({
  userId: z.string().uuid(),
  refreshToken: z.string().min(1),
});

export type RefreshDto = z.infer<typeof refreshSchema>;
