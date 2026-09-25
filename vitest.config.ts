import { defineConfig } from "vitest/config";
import { config } from "dotenv";
config({ path: ".env.test", override: true });
if (!process.env.DATABASE_URL?.includes("/peacock_test?"))
  throw new Error(
    "Tests require a dedicated peacock_test database; refusing to run.",
  );
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
