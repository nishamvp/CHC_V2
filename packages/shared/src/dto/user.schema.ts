import { z } from "zod";

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(50)
    .regex(
      /^[a-z0-9._-]+$/,
      "Use lowercase letters, numbers, dot, dash or underscore only",
    ),
  email: z.string().email(),
  password: z.string().min(8).max(72),
});
export type CreateUserDto = z.infer<typeof createUserSchema>;
