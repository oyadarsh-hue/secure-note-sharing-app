import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";
const db = new PrismaClient();
try {
  const email = z.email().parse(process.env.DEMO_EMAIL?.trim().toLowerCase());
  const password = z.string().min(12).max(72).parse(process.env.DEMO_PASSWORD);
  if (Buffer.byteLength(password) > 72) throw new Error("Password too long");
  const passwordHash = await hash(password, 12);
  await db.user.upsert({
    where: { email },
    create: { email, name: "Peacock Reviewer", passwordHash },
    update: { passwordHash },
  });
  console.log("Reviewer account seeded.");
} catch {
  console.error("Seed failed. Verify database and demo-account configuration.");
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
