import { z } from "zod";
import { passwordSchema } from "./password.schema";

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
  password: passwordSchema,
});
export type CreateUserDto = z.infer<typeof createUserSchema>;
