import { db } from "./db";
import { AppError } from "./errors";
import {
  generateKey,
  generateToken,
  hashPassword,
  hashToken,
  verifyPassword,
} from "./security";
import { noteSchema, tokenSchema } from "./validation";
import type { ShareLink } from "@prisma/client";
export function shareStatus(
  share: Pick<ShareLink, "revokedAt" | "consumedAt" | "expiresAt">,
  now = new Date(),
) {
  if (share.revokedAt) return "REVOKED";
  if (share.consumedAt) return "USED";
  if (share.expiresAt <= now) return "EXPIRED";
  return "ACTIVE";
}
async function databaseNow() {
  const rows = await db.$queryRaw<
    { now: Date }[]
  >`SELECT clock_timestamp() AS now`;
  return rows[0].now;
}
async function findShare(token: string) {
  if (!tokenSchema.safeParse(token).success)
    throw new AppError(404, "Invalid share link.");
  const share = await db.shareLink.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!share) throw new AppError(404, "Invalid share link.");
  return share;
}
export async function createNote(userId: string, input: unknown) {
  const data = noteSchema.parse(input);
  const token = generateToken();
  const accessKey =
    data.accessType === "PASSWORD_PROTECTED" ? generateKey() : null;
  const passwordHash = accessKey ? await hashPassword(accessKey) : null;
  const now = await databaseNow();
  if (new Date(data.expiresAt) <= now)
    throw new AppError(400, "Choose a future expiry.");
  // A nested Prisma write is a transaction: note and share succeed or fail together.
  const note = await db.note.create({
    data: {
      userId,
      title: data.title,
      content: data.content,
      share: {
        create: {
          tokenHash: hashToken(token),
          passwordHash,
          shareType: data.shareType,
          accessType: data.accessType,
          expiresAt: new Date(data.expiresAt),
        },
      },
    },
    select: { id: true },
  });
  return {
    noteId: note.id,
    shareUrl: `${process.env.NEXTAUTH_URL}/share/${token}`,
    accessKey,
    expiresAt: data.expiresAt,
    shareType: data.shareType,
    accessType: data.accessType,
  };
}
export async function getOwnedNote(userId: string, id: string) {
  const note = await db.note.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      share: {
        select: {
          expiresAt: true,
          shareType: true,
          accessType: true,
          consumedAt: true,
          revokedAt: true,
          viewCount: true,
        },
      },
    },
  });
  if (!note?.share) throw new AppError(404, "Note not found.");
  return {
    ...note,
    share: note.share,
    status: shareStatus(note.share, await databaseNow()),
  };
}
export async function revokeNote(userId: string, id: string) {
  await getOwnedNote(userId, id);
  await db.shareLink.updateMany({
    where: { noteId: id, revokedAt: null, note: { userId } },
    data: { revokedAt: await databaseNow() },
  });
  return { status: "REVOKED" };
}
export async function getShareStatus(token: string) {
  const share = await findShare(token);
  return {
    status: shareStatus(share, await databaseNow()),
    accessType: share.accessType,
    shareType: share.shareType,
    expiresAt: share.expiresAt,
  };
}
export async function accessShare(token: string, key?: string) {
  const share = await findShare(token);
  const status = shareStatus(share, await databaseNow());
  if (status !== "ACTIVE")
    throw new AppError(410, `This link is ${status.toLowerCase()}.`);
  if (
    share.accessType === "PASSWORD_PROTECTED" &&
    (!key ||
      !share.passwordHash ||
      !(await verifyPassword(key, share.passwordHash)))
  )
    throw new AppError(403, "Incorrect access key.");
  return db.$transaction(async (tx) => {
    // This UPDATE is the access decision. PostgreSQL locks the row and rechecks
    // the condition after a concurrent update. Only the winner receives content.
    const claimed = await tx.$queryRaw<{ noteId: string }[]>`
      UPDATE "ShareLink" SET
        "consumedAt" = CASE WHEN "shareType" = 'ONE_TIME' THEN clock_timestamp() ELSE "consumedAt" END,
        "viewCount" = "viewCount" + 1,
        "updatedAt" = clock_timestamp()
      WHERE "id" = ${share.id}
        AND "revokedAt" IS NULL AND "consumedAt" IS NULL
        AND "expiresAt" > clock_timestamp()
      RETURNING "noteId"`;
    if (claimed.length !== 1)
      throw new AppError(410, "This link is used, expired, or revoked.");
    return tx.note.findUniqueOrThrow({
      where: { id: claimed[0].noteId },
      select: { title: true, content: true },
    });
  });
}
