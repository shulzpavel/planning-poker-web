import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync(new URL("./fixtures/intake.json", import.meta.url), "utf8"),
);

const owner = {
  id: 1,
  username: "owner",
  display_name: "Owner",
  is_superuser: true,
  permissions: ["cms.planner.view"],
  roles: [],
  pages: [],
  theme_preference: "dark",
  intake_dashboard_access: true,
};

test("owner gets live CMS analytics, background loading, period changes and evidence drilldown", async ({
  page,
  isMobile,
}) => {
  let first = true;
  await page.addInitScript(() =>
    localStorage.setItem("planning_poker_cms_auth", "1"),
  );
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/auth/me"))
      return route.fulfill({ json: owner });
    const days = (url.searchParams.get("days") || "30") as "7" | "30" | "90";
    if (url.pathname.endsWith("/dashboards/intake/analysis"))
      return route.fulfill({ json: fixture.analyses[days] });
    if (url.pathname.endsWith("/dashboards/intake")) {
      if (first) {
        first = false;
        return route.fulfill({ status: 202, json: { status: "pending" } });
      }
      return route.fulfill({ json: fixture.snapshots[days] });
    }
    return route.fulfill({ json: {} });
  });
  if (!isMobile) await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/cms/dashboards/intake");
  await expect(
    page.getByRole("heading", {
      name: "Как мы разбираем продуктовые инициативы",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("group", {
      name: "Медиана и средний срок разбора по неделям",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Принято первых решений", { exact: true }),
  ).toHaveCount(0);
  if (!isMobile)
    expect(
      (await page.locator(".intake-content").boundingBox())!.width,
    ).toBeCloseTo(1920 * 0.8, 0);
  expect(
    await page.locator("body").evaluate((el) => el.scrollWidth <= innerWidth),
  ).toBe(true);
  await page.getByRole("button", { name: /19.10–25.10: медиана/ }).click();
  await expect(page.getByRole("dialog")).toContainText("TEST-2");
  await page
    .getByRole("button", { name: "Закрыть список", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "ИИ-подсказка: источники инициатив" }),
  ).not.toBeVisible();
  await page
    .getByText("ИИ-разбор: источники инициатив", { exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "ИИ-подсказка: источники инициатив" }),
  ).toContainText("Тестовый ИИ-вывод");
  await page.getByRole("button", { name: "Связанные запросы · 1" }).click();
  await expect(page.getByRole("dialog")).toContainText("TEST-1");
  await page
    .getByRole("button", { name: "Закрыть список", exact: true })
    .click();
  await page.getByRole("button", { name: "7 дней", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Результаты за 7 дней" }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "ИИ-подсказка: источники инициатив" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "TEST-1: Новая инициатива", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("link", { name: /TEST-1/ }),
  ).toHaveAttribute("href", "https://jira.example/browse/TEST-1");
});

test("another superuser has no dashboard navigation or data requests", async ({
  page,
}) => {
  let dataRequests = 0;
  await page.addInitScript(() =>
    localStorage.setItem("planning_poker_cms_auth", "1"),
  );
  await page.route("**/api/v1/**", async (route) => {
    if (route.request().url().includes("/dashboards/")) dataRequests++;
    return route.fulfill({
      json: route.request().url().endsWith("/auth/me")
        ? { ...owner, username: "other", intake_dashboard_access: false }
        : {},
    });
  });
  await page.goto("/cms/dashboards/intake");
  await expect(page).toHaveURL(/\/403$/);
  expect(dataRequests).toBe(0);
});
