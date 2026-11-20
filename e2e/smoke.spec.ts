import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function axe(page: Page) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).disableRules(["color-contrast"]).analyze();
  expect(r.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
}

test("overview shows the headline, KPIs and to-do queue", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Booking rate", { exact: true })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "To-do groups" })).toBeVisible();
  await axe(page);
});

test("calls list filters by type and search, synced to the URL", async ({ page }) => {
  await page.goto("/calls");
  const rows = page.locator("tbody tr");
  const all = await rows.count();
  await page.getByRole("radio", { name: /New Sale/ }).click();
  await expect(page).toHaveURL(/type=sales/);
  expect(await rows.count()).toBeLessThanOrEqual(all);
  await page.getByRole("searchbox", { name: "Search calls" }).fill("zzzz-no-match");
  await expect(page.getByText("No calls match these filters")).toBeVisible();
  await axe(page);
});

test("call detail seeks audio from the transcript and switches tabs", async ({ page }) => {
  await page.goto("/calls");
  await page.locator("tbody tr a").first().click();
  await expect(page.getByRole("slider", { name: "Seek" })).toBeVisible();
  const stamp = page.getByRole("button", { name: /Play from/ }).nth(2);
  await stamp.click();
  await expect.poll(async () => Number(await page.getByRole("slider", { name: "Seek" }).getAttribute("aria-valuenow"))).toBeGreaterThan(0);
  const coaching = page.getByRole("tab", { name: /Coaching/ });
  if (await coaching.count()) { await coaching.click(); await expect(coaching).toHaveAttribute("aria-selected", "true"); }
  await axe(page);
});

test("upload dialog opens from the keyboard and validates file type", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("u");
  await expect(page.getByRole("dialog", { name: "Upload a call" })).toBeVisible();
  await page.locator("input[type=file]").setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") });
  await expect(page.getByRole("alert")).toContainText("isn't an audio file");
});

test("command palette finds pages; ? opens shortcuts; light by default, dark on toggle", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
  expect(await bg()).toBe("rgb(243, 246, 253)");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  expect(await bg()).toBe("rgb(6, 11, 38)");
  await page.reload();
  expect(await bg()).toBe("rgb(6, 11, 38)");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await page.keyboard.press("Shift+Slash");
  await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Search .* calls/).fill("reps");
  await page.getByRole("option", { name: "Reps", exact: true }).click();
  await expect(page).toHaveURL(/\/reps/);
});

test("rep filter opens, filters and shows a removable chip", async ({ page }) => {
  await page.goto("/calls");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Filter by rep/ }).click();
  const first = page.getByRole("listbox", { name: "Rep" }).getByRole("option").first();
  const name = (await first.innerText()).split("\n")[0].trim();
  await first.getByRole("button").click();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(new RegExp(`rep=${encodeURIComponent(name)}`));
  await expect(page.getByRole("button", { name: new RegExp(`Rep: ${name}`) })).toBeVisible();
});

test("reps compare defaults to the team average", async ({ page }) => {
  await page.goto("/reps");
  await expect(page.getByRole("heading", { name: "Team average, all reps" })).toBeVisible();
  await axe(page);
});

test("coaching script copies and waveform markers seek", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/calls");
  await page.locator("tbody tr a").first().click();
  const marker = page.locator("button[aria-label*=' at ']").first();
  if (await marker.count()) { await marker.click(); await expect.poll(async () => Number(await page.getByRole("slider", { name: "Seek" }).getAttribute("aria-valuenow"))).toBeGreaterThan(0); }
  await page.getByRole("tab", { name: /Coaching/ }).click();
  await page.getByRole("button", { name: "Copy" }).first().click();
  await expect(page.getByText("Copied").first()).toBeVisible();
});

test("upload accepts a synthetic audio file and shows the stepper", async ({ page }) => {
  // Mocked: no real upload, so test runs never add calls to the workspace.
  await page.route("**/api/upload", (r) => r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Test mode: upload blocked" }) }));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("u");
  const wav = Buffer.alloc(44 + 800);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + 800, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(8000, 28); wav.writeUInt16LE(1, 32); wav.writeUInt16LE(8, 34); wav.write("data", 36); wav.writeUInt32LE(800, 40);
  await page.locator("input[type=file]").setInputFiles({ name: "tone.wav", mimeType: "audio/wav", buffer: wav });
  await expect(page.getByText("tone.wav")).toBeVisible();
  await expect(page.getByText("Test mode: upload blocked")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
