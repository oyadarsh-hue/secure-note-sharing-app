import { beforeAll, afterAll, it, expect } from "vitest";
import { db } from "../src/server/db";
import { accessShare, createNote, getOwnedNote } from "../src/server/shares";
import { reset, account, noteInput, tokenFrom } from "./helpers";
let owner: string;
beforeAll(async () => {
  await reset();
  owner = (await account()).id;
});
afterAll(async () => {
  await reset();
  await db.$disconnect();
});
it.each(["PUBLIC", "PASSWORD_PROTECTED"])(
  "exactly one of two concurrent %s readers wins in PostgreSQL",
  async (accessType) => {
    const created = await createNote(
      owner,
      noteInput({ shareType: "ONE_TIME", accessType }),
    );
    const token = tokenFrom(created.shareUrl);
    const results = await Promise.allSettled([
      accessShare(token, created.accessKey ?? undefined),
      accessShare(token, created.accessKey ?? undefined),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const losers = results.filter((r) => r.status === "rejected");
    expect(losers).toHaveLength(1);
    expect(losers[0].reason).toMatchObject({ status: 410 });
    expect((await getOwnedNote(owner, created.noteId)).share.viewCount).toBe(1);
  },
);
it("one winner under 25 simultaneous requests", async () => {
  const created = await createNote(owner, noteInput({ shareType: "ONE_TIME" }));
  const results = await Promise.allSettled(
    Array.from({ length: 25 }, () => accessShare(tokenFrom(created.shareUrl))),
  );
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect((await getOwnedNote(owner, created.noteId)).share.viewCount).toBe(1);
});
