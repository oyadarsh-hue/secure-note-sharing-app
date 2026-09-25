import { test, expect } from "@playwright/test";
test("home and registration remain usable on mobile and tablet", async ({
  page,
}) => {
  for (const width of [390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.goto("/register");
    await expect(
      page.getByRole("button", { name: "Create account", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});
test("registration, protected sharing, atomic API access, ownership and revocation", async ({
  page,
  browser,
  baseURL,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Name", { exact: true }).fill("Assessment QA");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("QA#Peacock2026!");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("QA#Peacock2026!");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/notes$/);
  await page.getByRole("link", { name: "Create a note" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Protected QA note");
  await page
    .getByLabel("Note content")
    .fill('<script>alert("unsafe")</script> Only plain text.');
  const future = new Date(Date.now() + 3600000);
  future.setMinutes(future.getMinutes() - future.getTimezoneOffset());
  await page.getByLabel("Expires at").fill(future.toISOString().slice(0, 16));
  await page.getByRole("button", { name: "Create secure link" }).click();
  await expect(page.getByText("Your note is ready to share.")).toBeVisible();
  const shareUrl = await page.getByLabel("Share URL").inputValue();
  const key = await page.getByLabel("Access key", { exact: true }).inputValue();
  await page.getByRole("link", { name: "Manage note" }).click();
  const manageUrl = page.url();
  await expect(page.getByTestId("view-count")).toHaveText("0");
  const guest = await browser.newContext({ baseURL });
  const reader = await guest.newPage();
  await reader.goto(shareUrl);
  await reader.getByLabel("Access key").fill("wrong");
  await reader.getByRole("button", { name: "Unlock note" }).click();
  await expect(reader.locator("main").getByRole("alert")).toContainText(
    "Incorrect access key",
  );
  await page.reload();
  await expect(page.getByTestId("view-count")).toHaveText("0");
  await reader.getByLabel("Access key").fill(key);
  await reader.getByRole("button", { name: "Unlock note" }).click();
  await expect(
    reader.getByRole("heading", { name: "Protected QA note" }),
  ).toBeVisible();
  await expect(
    reader.getByText('<script>alert("unsafe")</script> Only plain text.', {
      exact: true,
    }),
  ).toBeVisible();
  await reader.reload();
  await expect(reader.locator("main").getByRole("alert")).toContainText("used");
  await page.reload();
  await expect(page.getByTestId("view-count")).toHaveText("1");
  const headers = { origin: baseURL!, "Content-Type": "application/json" };
  const anonymous = await guest.request.get(
    `/api/notes/${manageUrl.split("/").pop()}`,
  );
  expect(anonymous.status()).toBe(401);
  const unauthorizedRevoke = await guest.request.post(
    `/api/notes/${manageUrl.split("/").pop()}/revoke`,
    { headers, data: {} },
  );
  expect(unauthorizedRevoke.status()).toBe(401);
  const make = async (extra: Record<string, unknown> = {}) => {
    const response = await page.request.post("/api/notes", {
      headers,
      data: {
        title: "API QA note",
        content: "Sample content",
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        shareType: "ONE_TIME",
        accessType: "PUBLIC",
        ...extra,
      },
    });
    expect(response.status()).toBe(201);
    return response.json();
  };
  const created = await make();
  const token = created.shareUrl.split("/").pop();
  const race = await Promise.all([
    guest.request.post(`/api/share/${token}/access`, { headers, data: {} }),
    guest.request.post(`/api/share/${token}/access`, { headers, data: {} }),
  ]);
  expect(race.map((r) => r.status()).sort()).toEqual([200, 410]);
  const ownerResult = await page.request.get(`/api/notes/${created.noteId}`);
  expect((await ownerResult.json()).share.viewCount).toBe(1);
  const timeBased = await make({ shareType: "TIME_BASED" });
  await reader.goto(timeBased.shareUrl);
  await reader.getByRole("button", { name: "Open note" }).click();
  await expect(
    reader.getByRole("heading", { name: "API QA note" }),
  ).toBeVisible();
  await page.goto(`/notes/${timeBased.noteId}`);
  await expect(page.getByTestId("view-count")).toHaveText("1");
  await page.getByRole("button", { name: "Revoke share link" }).click();
  await page.getByRole("button", { name: "Confirm revoke" }).click();
  await expect(page.getByText("REVOKED", { exact: true })).toBeVisible();
  await reader.reload();
  await expect(reader.locator("main").getByRole("alert")).toContainText(
    "revoked",
  );
  const expiring = await make({
    shareType: "TIME_BASED",
    expiresAt: new Date(Date.now() + 2500).toISOString(),
  });
  await reader.goto(expiring.shareUrl);
  await expect
    .poll(
      async () => {
        const res = await guest.request.get(
          `/api/share/${expiring.shareUrl.split("/").pop()}/status`,
        );
        return (await res.json()).status;
      },
      { timeout: 10000 },
    )
    .toBe("EXPIRED");
  await reader.reload();
  await expect(reader.locator("main").getByRole("alert")).toContainText(
    "expired",
  );
  const forged = await page.request.post("/api/notes", {
    headers: {
      origin: "https://attacker.example",
      "Content-Type": "application/json",
    },
    data: {},
  });
  expect(forged.status()).toBe(403);
  await guest.close();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("QA#Peacock2026!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/notes$/);
});
