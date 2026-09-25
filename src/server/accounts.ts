import { Prisma } from "@prisma/client";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./security";
import { loginSchema, registerSchema } from "./validation";
import { AppError } from "./errors";
// Fixed bcrypt digest performs comparable work when an account does not exist.
const DUMMY = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYjN8uDH9JLZmBYAjYSoLD4VoBMfyj9W";
export async function register(input: unknown) {
  const data = registerSchema.parse(input);
  const passwordHash = await hashPassword(data.password);
  try {
    return await db.user.create({
      data: { name: data.name, email: data.email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new AppError(409, "Unable to register this email. Try signing in.");
    throw error;
  }
}
export async function authenticate(input: unknown) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
  });
  const valid = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? DUMMY,
  );
  return valid && user
    ? { id: user.id, name: user.name, email: user.email }
    : null;
}
