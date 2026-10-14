import { z } from "zod";

// bcrypt only reads the first 72 BYTES (Arabic letters take 2 bytes each)
const byteLength = (value: string) => new TextEncoder().encode(value).length;

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .refine((value) => byteLength(value) <= 72, "Password is too long");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
