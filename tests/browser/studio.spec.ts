import { test, expect, type Page } from "@playwright/test";
const pageErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error")
      console.log("Browser console:", message.text());
  });
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page) ?? []).toEqual([]);
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
  await page.getByRole("button", { name: "Learn", exact: true }).click();
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
  await expect(page.getByRole("cell", { name: "Pilot One" })).toBeVisible();
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
      .locator(".asteroid")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("rocket flight controls and fullscreen view are interactive", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("img", { name: "Space flight map" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/pixelpilot-flight.png", fullPage: true });
  await page
    .getByRole("button", { name: "Asteroid", exact: true })
    .first()
    .click();
  await expect(
    page.getByText("This rock blocks the way. Fly around it."),
  ).toBeVisible();
  await page.getByText("This rock blocks the way. Fly around it.").click();
  await page.getByRole("combobox", { name: "Speed" }).selectOption("700");
  await page.getByRole("button", { name: "Run my code" }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Show one step" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Not at the station yet",
  );
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Show one step" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Not at the station yet",
  );
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "stop", exact: true }).click();
  await page.getByRole("button", { name: "Bigger game screen" }).click();
  await expect(page.locator(".flight-workspace")).toHaveClass(
    /flight-expanded/,
  );
  await page.getByRole("button", { name: "Exit full screen" }).click();
  await expect(page.locator(".flight-workspace")).not.toHaveClass(
    /flight-expanded/,
  );
});
test("teacher can draft, test and publish a mission for students", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("en");
  await page.getByLabel("Classroom email").fill("teacher@class.test");
  await page.getByLabel("Passphrase").fill("classroom-passphrase");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL("http://127.0.0.1:3002/", { timeout: 20000 });
  await page.goto("/teacher");
  await expect(
    page.getByRole("heading", { name: "Teacher studio", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Lesson name", { exact: true })
    .fill("A secret draft mission");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByRole("status")).toContainText("Lesson saved.");
  await expect(
    page.getByRole("button", { name: /A secret draft mission/ }),
  ).toBeVisible();
  const student = await browser.newContext();
  const studentPage = await student.newPage();
  await login(studentPage);
  await studentPage
    .getByRole("button", { name: "Class missions", exact: true })
    .click();
  await expect(studentPage.getByText("A secret draft mission")).toHaveCount(0);
  await studentPage.goto("/teacher");
  await expect(
    studentPage.getByRole("heading", { name: /This page is for teachers/ }),
  ).toBeVisible();
  await student.close();
  await page
    .getByLabel("Lesson name", { exact: true })
    .fill("Shared space mission");
  await page
    .getByRole("button", { name: "Place the station", exact: true })
    .click();
  await page.getByRole("button", { name: "B1", exact: true }).click();
  await page
    .getByRole("button", { name: "Try this mission", exact: true })
    .click();
  await expect(
    page.locator(".teacher-preview .blocklySvg").first(),
  ).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Run my code" }).click();
  await expect(
    page.getByRole("button", { name: "Publish for my class", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Publish for my class", exact: true })
    .click();
  await expect(page.getByRole("status").first()).toContainText(
    "Your class can now open this lesson.",
  );
  const pupil = await browser.newContext();
  const pupilPage = await pupil.newPage();
  await login(pupilPage);
  await pupilPage
    .getByRole("button", { name: "Class missions", exact: true })
    .click();
  await expect(
    pupilPage.getByRole("heading", {
      name: "Shared space mission",
      exact: true,
    }),
  ).toBeVisible();
  await pupilPage
    .getByRole("button", { name: "Open mission", exact: true })
    .click();
  await expect(pupilPage.locator(".blocklySvg").first()).toBeVisible({
    timeout: 15000,
  });
  await pupilPage.getByRole("button", { name: "Run my code" }).click();
  await expect(pupilPage.getByRole("status")).toContainText(
    "Challenge verified and saved.",
  );
  await pupil.close();
  await page
    .getByRole("button", { name: "Refresh progress", exact: true })
    .click();
  await expect(page.getByRole("row", { name: /Pilot One/ })).toContainText("✓");
});
