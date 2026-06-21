import { expect, test } from "@playwright/test";

const username = process.env.CMS_USERNAME ?? "";
const password = process.env.CMS_PASSWORD ?? "";
const hasCreds = Boolean(username && password);

async function cmsLogin(page: import("@playwright/test").Page) {
  await page.goto("/cms");
  await expect(page.getByRole("heading", { name: "Админка Planning Poker" })).toBeVisible();

  await page.getByLabel("Username").fill(username);
  await page.locator('input[type="password"]').fill(password);
  await expect(page.getByRole("button", { name: "Войти" })).toBeEnabled();
  await page.getByRole("button", { name: "Войти" }).click();

  await expect(page.getByRole("heading", { name: "Админка Planning Poker" })).toBeHidden({ timeout: 20_000 });
}

async function confirmDeleteDialog(page: import("@playwright/test").Page, confirmLabel = "Удалить") {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText(/Точно удалить|Удалить план|Удалить ретро|Удалить отчёт|Удалить задачу|Удалить сессию/),
  ).toBeVisible();
  await dialog.getByRole("button", { name: confirmLabel }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

test.describe("production delete confirm flows", () => {
  test.skip(!hasCreds, "Set CMS_USERNAME and CMS_PASSWORD to run prod delete tests");

  test.beforeEach(async ({ page }) => {
    await cmsLogin(page);
  });

  test("planner: create plan, delete from edit screen, return to list", async ({ page }) => {
    const planName = `QA delete ${Date.now()}`;
    await page.goto("/cms/planner/new");
    await page.getByLabel("Название спринта").fill(planName);
    await page.getByRole("button", { name: "Создать" }).click();
    await expect(page).toHaveURL(/\/cms\/planner\/\d+/);

    await page.getByRole("button", { name: "Удалить" }).click();
    await confirmDeleteDialog(page, "Удалить");

    await expect(page).toHaveURL(/\/cms\/planner\/?$/);
    await expect(page.getByText(planName)).toHaveCount(0);
  });

  test("retro: create draft, delete from list", async ({ page }) => {
    const title = `QA retro delete ${Date.now()}`;
    await page.goto("/cms/retro/new");
    await page.getByLabel("Название ретро").fill(title);
    await page.getByRole("button", { name: "Создать" }).click();
    await expect(page).toHaveURL(/\/cms\/retro\/\d+/);

    await page.goto("/cms/retro");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
    const card = page.locator("article, tr").filter({ hasText: title }).first();
    await card.getByRole("button", { name: "Удалить" }).click();
    await confirmDeleteDialog(page, "Удалить");

    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("delete confirm cancel does not remove entity", async ({ page }) => {
    const planName = `QA cancel ${Date.now()}`;
    await page.goto("/cms/planner/new");
    await page.getByLabel("Название спринта").fill(planName);
    await page.getByRole("button", { name: "Создать" }).click();
    await expect(page).toHaveURL(/\/cms\/planner\/\d+/);

    await page.getByRole("button", { name: "Удалить" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Отмена" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/cms\/planner\/\d+/);

    await page.getByRole("button", { name: "Удалить" }).click();
    await confirmDeleteDialog(page, "Удалить");
    await expect(page).toHaveURL(/\/cms\/planner\/?$/);
  });
});
