import { handle } from "hono/vercel";
import { app } from "@/server/api";
export const POST = handle(app);
