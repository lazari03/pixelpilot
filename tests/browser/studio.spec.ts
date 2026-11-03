import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.log("Browser error:", error.message));
  page.on("console", (message) => {
    if (message.type() === "error")
      console.log("Browser console:", message.text());
  });
});
async function login(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("en");
  await page.getByLabel("Classroom email").fill("student@class.test");
  await page.getByLabel("Passphrase").fill("classroom-passphrase");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3002/", { timeout: 20000 });
  await expect(
    page.getByRole("heading", { name: "Your adventure starts here." }),
  ).toBeVisible({ timeout: 15000 });
}
test("requires login, supports both languages and removes the old guest route", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "Aventura jote fillon këtu." }),
  ).toBeVisible();
  await expect(page.getByText("Explore the practice demo")).toHaveCount(0);
  await page.goto("/teacher");
  await expect(page).toHaveURL(/\/login$/);
  await login(page);
  await expect(
    page.getByRole("button", { name: /Power, Numbers/ }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: "Language" }).selectOption("sq");
  await expect(
    page.getByRole("button", { name: "Programo rrugën", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Programo rrugën", exact: true }),
  ).toBeVisible();
});
test("teaches structured prompts, confirms actions, and shows a large coding workspace", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: /3\. A prompt is a plan/ }).click();
  for (const check of await page.locator(".lesson-activities input").all())
    await check.check();
  await page.getByRole("button", { name: "Lesson understood" }).click();
  await expect(
    page.getByRole("button", { name: "✓ Completed", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Prompt Lab", exact: true }).click();
  await page.getByLabel("I understand—let me practise").check();
  await page.getByLabel("Goal", { exact: true }).fill("do it");
  await page.getByRole("button", { name: "Preview my prompt" }).click();
  await expect(page.getByRole("status")).toContainText("Revise your prompt");
  await page.getByLabel("Goal", { exact: true }).fill("move right 3 steps");
  await page
    .getByLabel("Context", { exact: true })
    .fill("The robot starts at the top-left corner");
  await page
    .getByLabel("Rules", { exact: true })
    .fill("Avoid trees and show the route first");
  await page
    .getByLabel("Response format", { exact: true })
    .selectOption("action plan");
  await page.getByRole("button", { name: "Preview my prompt" }).click();
  await expect(
    page.getByRole("button", { name: "Apply action" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Apply action" }).click();
  await expect(
    page.getByRole("heading", { name: "Code your route", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".blocklySvg").first()).toBeVisible({
    timeout: 15000,
  });
  const box = await page.locator(".block-workspace").boundingBox();
  expect(box!.height).toBeGreaterThan(400);
  await page
    .getByRole("button", { name: "Checkpoint quiz", exact: true })
    .click();
  await expect(
    page.getByText(
      "Complete the three coding challenges and structured prompt before the checkpoint.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start learning" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "🏆 Classroom leaderboard", exact: true })
    .click();
  await expect(page.getByRole("cell", { name: "Robot One" })).toBeVisible();
});
test("mobile layout and reduced motion remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  await page
    .getByRole("button", { name: "Code your route", exact: true })
    .click();
  await expect(page.locator(".blocklySvg").first()).toBeVisible({
    timeout: 15000,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator(".moving-robot")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});
