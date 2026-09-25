import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { ZodError } from "zod";
import { requireUser } from "./auth";
import { register } from "./accounts";
import {
  accessShare,
  createNote,
  getOwnedNote,
  getShareStatus,
  revokeNote,
} from "./shares";
import { AppError } from "./errors";
import { clientIp, rateLimit } from "./rate-limit";
import { hashToken } from "./security";
import { accessSchema } from "./validation";
export const app = new Hono().basePath("/api");
app.use("*", async (c, next) => {
  c.header("Cache-Control", "no-store, max-age=0");
  c.header("Pragma", "no-cache");
  await next();
});
app.use(
  "*",
  bodyLimit({
    maxSize: 100000,
    onError: (c) => c.json({ error: "Request too large." }, 413),
  }),
);
app.use("*", async (c, next) => {
  if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    const expected = process.env.NEXTAUTH_URL;
    if (!expected || c.req.header("origin") !== new URL(expected).origin)
      throw new AppError(403, "Request origin not allowed.");
    if (!c.req.header("content-type")?.startsWith("application/json"))
      throw new AppError(400, "JSON body required.");
  }
  await next();
});
app.post("/auth/register", async (c) => {
  await rateLimit(`register:${clientIp(c.req.raw.headers)}`, 10, 3600);
  const user = await register(await c.req.json());
  return c.json(user, 201);
});
app.post("/notes", async (c) => {
  const user = await requireUser();
  await rateLimit(`create:${user}`, 30, 3600);
  return c.json(await createNote(user, await c.req.json()), 201);
});
app.get("/notes/:id", async (c) =>
  c.json(await getOwnedNote(await requireUser(), c.req.param("id"))),
);
app.post("/notes/:id/revoke", async (c) =>
  c.json(await revokeNote(await requireUser(), c.req.param("id"))),
);
app.get("/share/:token/status", async (c) => {
  await rateLimit(`status:${clientIp(c.req.raw.headers)}`, 120);
  return c.json(await getShareStatus(c.req.param("token")));
});
app.post("/share/:token/access", async (c) => {
  const token = c.req.param("token");
  const ip = clientIp(c.req.raw.headers);
  await rateLimit(`access-ip:${ip}`, 60);
  await rateLimit(`access-share-ip:${hashToken(token)}:${ip}`, 10);
  const input = accessSchema.parse(await c.req.json());
  return c.json(await accessShare(token, input.key));
});
app.onError((error, c) => {
  if (error instanceof AppError) {
    if (error.status === 429) c.header("Retry-After", "60");
    return c.json({ error: error.message }, error.status);
  }
  if (error instanceof ZodError)
    return c.json({ error: error.issues[0]?.message ?? "Invalid input." }, 400);
  if (error instanceof SyntaxError)
    return c.json({ error: "Invalid JSON body." }, 400);
  // Do not log request bodies, tokens, Prisma queries, or credentials.
  console.error("API request failed", { type: error.name });
  return c.json(
    { error: "Unable to complete the request. Please try again." },
    500,
  );
});
