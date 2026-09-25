import { z } from "zod";
export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export const registerSchema = loginSchema
  .extend({
    name: z.string().trim().min(1).max(80),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });
export const noteSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(20000),
  expiresAt: z.iso
    .datetime({ offset: true })
    .refine((v) => Date.parse(v) > Date.now(), "Choose a future expiry"),
  shareType: z.enum(["ONE_TIME", "TIME_BASED"]),
  accessType: z.enum(["PUBLIC", "PASSWORD_PROTECTED"]),
});
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const accessSchema = z.object({ key: z.string().max(72).optional() });
