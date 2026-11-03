import { test, expect } from "@playwright/test";
test("Blockly and local tutor actions require confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".blocklySvg").first()).toBeVisible();
  await page.getByRole("button", { name: "Run my blocks" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    "Not at the flag yet",
  );
  await expect(page.locator(".tile").nth(1).getByLabel("robot")).toBeVisible();
  await page.getByLabel("Ask the local tutor").fill("move down 1 step");
  await page.getByRole("button", { name: "Understand my request" }).click();
  await expect(page.locator(".tile").nth(1).getByLabel("robot")).toBeVisible();
  await page.getByRole("button", { name: "Apply this action" }).click();
  await expect(page.getByRole("status").first()).toContainText("An obstacle");
  await page.getByRole("button", { name: /03 Choices/ }).click();
  await page.getByLabel("Ask the local tutor").fill("set gate to AND");
  await page.getByRole("button", { name: "Understand my request" }).click();
  await expect(page.getByLabel("Gate operator")).toHaveValue("OR");
  await page.getByRole("button", { name: "Apply this action" }).click();
  await expect(page.getByLabel("Gate operator")).toHaveValue("AND");
  await page.getByLabel("Ask the local tutor").fill("explain loops");
  await page.getByRole("button", { name: "Understand my request" }).click();
  await expect(page.getByText(/A loop repeats instructions/)).toBeVisible();
  await page.getByRole("button", { name: "Needs work", exact: true }).click();
  await expect(page.getByText(/Name what was missing/)).toBeVisible();
  await page.getByLabel("Ask the local tutor").fill("delete all accounts");
  await page.getByRole("button", { name: "Understand my request" }).click();
  await expect(
    page.getByRole("button", { name: "Apply this action" }),
  ).toHaveCount(0);
});
test("mobile layout fits viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Big ideas start with" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
