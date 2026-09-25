import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { db } from "../src/server/db";
import { register, authenticate } from "../src/server/accounts";
import {
  createNote,
  accessShare,
  getOwnedNote,
  getShareStatus,
  revokeNote,
} from "../src/server/shares";
import {
  hashToken,
  generateKey,
  generateToken,
  verifyPassword,
} from "../src/server/security";
import { rateLimit } from "../src/server/rate-limit";
import { reset, account, password, noteInput, tokenFrom } from "./helpers";
let owner: string;
beforeAll(async () => {
  await reset();
  owner = (await account()).id;
});
afterAll(async () => {
  await reset();
  await db.$disconnect();
});
describe("account security", () => {
  it("registers with normalized unique email and a bcrypt hash", async () => {
    const user = await account(" SECOND@EXAMPLE.COM ");
    expect(user.email).toBe("second@example.com");
    const stored = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.passwordHash).not.toBe(password);
    expect(await verifyPassword(password, stored.passwordHash)).toBe(true);
  });
  it("rejects duplicate normalized email", async () => {
    await expect(account("OWNER@EXAMPLE.COM")).rejects.toMatchObject({
      status: 409,
    });
  });
  it("authenticates correct credentials", async () => {
    expect(
      (await authenticate({ email: "OWNER@example.com", password }))?.id,
    ).toBe(owner);
  });
  it("rejects invalid credentials and unknown accounts", async () => {
    expect(
      await authenticate({
        email: "owner@example.com",
        password: "WrongPassword123!",
      }),
    ).toBeNull();
    expect(
      await authenticate({ email: "nobody@example.com", password }),
    ).toBeNull();
  });
  it("rejects mismatched or oversized passwords", async () => {
    await expect(
      register({
        name: "Test",
        email: "test@example.com",
        password,
        confirmPassword: "different",
      }),
    ).rejects.toThrow();
    await expect(
      register({
        name: "Test",
        email: "test@example.com",
        password: "é".repeat(40),
        confirmPassword: "é".repeat(40),
      }),
    ).rejects.toThrow();
  });
});
describe("sharing lifecycle", () => {
  it("creates public time-based note and exposes no hashes", async () => {
    const created = await createNote(owner, noteInput());
    expect(created.accessKey).toBeNull();
    const note = await getOwnedNote(owner, created.noteId);
    expect(note.status).toBe("ACTIVE");
    expect(JSON.stringify(note)).not.toMatch(/passwordHash|tokenHash/);
  });
  it("stores only the hash of a 256-bit token", async () => {
    const created = await createNote(owner, noteInput());
    const token = tokenFrom(created.shareUrl);
    expect(token).toHaveLength(43);
    const stored = await db.shareLink.findUniqueOrThrow({
      where: { noteId: created.noteId },
    });
    expect(stored.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(stored)).not.toContain(token);
  });
  it("status GET never reveals or consumes content", async () => {
    const created = await createNote(
      owner,
      noteInput({ shareType: "ONE_TIME" }),
    );
    const token = tokenFrom(created.shareUrl);
    expect(await getShareStatus(token)).toMatchObject({ status: "ACTIVE" });
    await getShareStatus(token);
    expect((await getOwnedNote(owner, created.noteId)).share.viewCount).toBe(0);
  });
  it("counts successful public views atomically", async () => {
    const created = await createNote(owner, noteInput());
    const token = tokenFrom(created.shareUrl);
    await Promise.all(Array.from({ length: 12 }, () => accessShare(token)));
    expect((await getOwnedNote(owner, created.noteId)).share.viewCount).toBe(
      12,
    );
  });
  it("generates and hashes a protected access key", async () => {
    const created = await createNote(
      owner,
      noteInput({ accessType: "PASSWORD_PROTECTED" }),
    );
    expect(created.accessKey).toMatch(/^[A-HJ-NP-Z2-9]{20}$/);
    const share = await db.shareLink.findUniqueOrThrow({
      where: { noteId: created.noteId },
    });
    expect(share.passwordHash).not.toBe(created.accessKey);
    expect(await verifyPassword(created.accessKey!, share.passwordHash!)).toBe(
      true,
    );
  });
  it("wrong and missing keys neither count nor consume; correct key succeeds once", async () => {
    const created = await createNote(
      owner,
      noteInput({ shareType: "ONE_TIME", accessType: "PASSWORD_PROTECTED" }),
    );
    const token = tokenFrom(created.shareUrl);
    await expect(accessShare(token, "WRONG")).rejects.toMatchObject({
      status: 403,
    });
    await expect(accessShare(token)).rejects.toMatchObject({ status: 403 });
    expect((await getOwnedNote(owner, created.noteId)).share.viewCount).toBe(0);
    expect((await accessShare(token, created.accessKey!)).title).toBe(
      "A private note",
    );
    await expect(accessShare(token, created.accessKey!)).rejects.toMatchObject({
      status: 410,
    });
    expect((await getOwnedNote(owner, created.noteId)).share.viewCount).toBe(1);
  });
  it("public one-time access succeeds once", async () => {
    const created = await createNote(
      owner,
      noteInput({ shareType: "ONE_TIME" }),
    );
    const token = tokenFrom(created.shareUrl);
    await accessShare(token);
    await expect(accessShare(token)).rejects.toMatchObject({ status: 410 });
    expect((await getOwnedNote(owner, created.noteId)).status).toBe("USED");
  });
  it("expired links do not reveal content or increment", async () => {
    const created = await createNote(owner, noteInput());
    await db.shareLink.update({
      where: { noteId: created.noteId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(
      accessShare(tokenFrom(created.shareUrl)),
    ).rejects.toMatchObject({ status: 410 });
    const note = await getOwnedNote(owner, created.noteId);
    expect(note.status).toBe("EXPIRED");
    expect(note.share.viewCount).toBe(0);
  });
  it("revocation is idempotent and prevents access even with the correct key", async () => {
    const created = await createNote(
      owner,
      noteInput({ accessType: "PASSWORD_PROTECTED" }),
    );
    await revokeNote(owner, created.noteId);
    const first = await getOwnedNote(owner, created.noteId);
    await revokeNote(owner, created.noteId);
    await expect(
      accessShare(tokenFrom(created.shareUrl), created.accessKey!),
    ).rejects.toMatchObject({ status: 410 });
    const second = await getOwnedNote(owner, created.noteId);
    expect(second.status).toBe("REVOKED");
    expect(second.share.revokedAt).toEqual(first.share.revokedAt);
    expect(second.share.viewCount).toBe(0);
  });
  it("rejects invalid tokens", async () => {
    await expect(accessShare("bad")).rejects.toMatchObject({ status: 404 });
    await expect(accessShare(generateToken())).rejects.toMatchObject({
      status: 404,
    });
  });
  it("rejects another owner from viewing or revoking", async () => {
    const other = await account("other@example.com");
    const created = await createNote(owner, noteInput());
    await expect(getOwnedNote(other.id, created.noteId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(revokeNote(other.id, created.noteId)).rejects.toMatchObject({
      status: 404,
    });
    expect((await getOwnedNote(owner, created.noteId)).status).toBe("ACTIVE");
  });
  it("rejects past expiry, oversized content and empty titles", async () => {
    for (const invalid of [
      { expiresAt: new Date(0).toISOString() },
      { content: "a".repeat(20001) },
      { title: "  " },
    ])
      await expect(createNote(owner, noteInput(invalid))).rejects.toThrow();
  });
  it("failed nested creation leaves no orphan note or share", async () => {
    const before = await db.note.count();
    await expect(createNote("missing-user", noteInput())).rejects.toThrow();
    expect(await db.note.count()).toBe(before);
  });
  it("uses independent random tokens and keys", () => {
    expect(new Set(Array.from({ length: 100 }, generateToken)).size).toBe(100);
    expect(new Set(Array.from({ length: 100 }, generateKey)).size).toBe(100);
  });
  it("shares atomic rate-limit state across concurrent callers", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => rateLimit("unit-bucket", 5)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(7);
  });
});
