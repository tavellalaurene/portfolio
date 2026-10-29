import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const mode = (page: Page) => page.evaluate(() => document.documentElement.dataset.mode ?? "lead");
const split = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.querySelector("[data-hero]")!).getPropertyValue("--split").trim());

// Any console error (including a Content Security Policy violation) fails the test.
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  test.info().annotations.push({ type: "errors", description: "" });
  (page as Page & { errors: string[] }).errors = errors;
});
test.afterEach(async ({ page }) => {
  expect((page as Page & { errors: string[] }).errors, "console / CSP errors").toEqual([]);
});

test("opens in Lead mode with no horizontal scroll", async ({ page }) => {
  await page.goto("./");
  expect(await mode(page)).toBe("lead");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/I lead teams/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("toggle switches mode, glides the divider and is remembered", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Build" }).click();
  expect(await mode(page)).toBe("build");
  await expect.poll(() => split(page)).toBe("12%");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/lead --teams/);
  await page.reload();
  expect(await mode(page)).toBe("build");
});

test("?mode=build opens Build mode", async ({ page }) => {
  await page.goto("./?mode=build");
  expect(await mode(page)).toBe("build");
});

test("divider handle works with the keyboard", async ({ page }) => {
  await page.goto("./");
  const handle = page.getByRole("slider", { name: "Switch between Lead and Build" });
  await handle.focus();
  await page.keyboard.press("Enter");
  expect(await mode(page)).toBe("build");
  await page.keyboard.press("ArrowRight");
  await expect(handle).toHaveAttribute("aria-valuenow", "17");
  await page.keyboard.press("End");
  expect(await mode(page)).toBe("lead");
});

test("dragging the handle past the middle switches mode", async ({ page }, info) => {
  test.skip(info.project.name === "phone", "mouse drag is covered on desktop");
  await page.goto("./");
  const handle = await page.locator("[data-handle]").boundingBox();
  const hero = await page.locator("[data-hero]").boundingBox();
  await page.mouse.move(handle!.x + handle!.width / 2, handle!.y + handle!.height / 2);
  await page.mouse.down();
  await page.mouse.move(hero!.x + hero!.width * 0.3, handle!.y, { steps: 8 });
  await page.mouse.up();
  expect(await mode(page)).toBe("build");
});

test("project filters", async ({ page }) => {
  await page.goto("./");
  const cards = page.locator("#work .project:visible");
  const total = await cards.count();
  await page.getByRole("button", { name: "Personal", exact: true }).click();
  const personal = await cards.count();
  expect(personal).toBeGreaterThan(0);
  expect(personal).toBeLessThan(total);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(cards).toHaveCount(total);
});

test("console: commands, completion, and no HTML injection", async ({ page }) => {
  await page.goto("./?mode=build");
  const toggle = page.locator("[data-console-toggle]");
  if (!(await page.locator("[data-console-panel]").isVisible())) await toggle.click();
  const input = page.getByRole("textbox", { name: "Console command" });
  const run = async (cmd: string) => {
    await input.fill(cmd);
    await input.press("Enter");
  };
  await run("whoami");
  await expect(page.locator("[data-console-output]")).toContainText("Development Team Lead");
  await run("projets");
  await expect(page.locator("[data-console-output]")).toContainText('Did you mean "projects"');
  await run("sudo rm -rf /");
  await expect(page.locator("[data-console-output]")).toContainText("Nice try, let’s talk");
  await expect(page.locator('[data-console-output] a[href*="linkedin.com"]')).toHaveCount(1);
  await run("<img src=x onerror=alert(1)>");
  await expect(page.locator("[data-console-output] img")).toHaveCount(0);
  await input.fill("wh");
  await input.press("Tab");
  await expect(input).toHaveValue("whoami ");
  await run("lead");
  expect(await mode(page)).toBe("lead");
  await expect(page.locator("[data-console]")).toBeHidden();
});

test("works without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://localhost:4321/portfolio/");
  await expect(page.getByRole("heading", { level: 1 }).first()).toHaveText(/I lead teams/);
  await expect(page.locator("#work .project")).toHaveCount(await page.locator("#work .project").count());
  await expect(page.locator("[data-mode-toggle]")).toBeHidden();
  await context.close();
});

for (const m of ["lead", "build"] as const) {
  test(`no accessibility violations in ${m} mode`, async ({ page }) => {
    await page.goto(`./?mode=${m}`);
    await page.locator("[data-console-panel]").evaluate((el) => ((el as HTMLElement).hidden = true));
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
}
