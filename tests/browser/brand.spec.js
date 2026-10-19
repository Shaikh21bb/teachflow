import { test, expect } from "@playwright/test";
async function setup(page) {
  await page.addInitScript(() => {
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
  });
}
test("teacher returns to requested work after login, dashboard failures stay visible, and mobile menu fits five actions", async ({
  page,
}, info) => {
  await setup(page);
  await page.goto("/assignments");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("Email", { exact: true }).fill("teacher@test.example");
  await page.getByLabel("Пароль", { exact: true }).fill("Testing12345");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/assignments$/);
  await page.route("**/api/dashboard/stats", (r) =>
    r.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Статистика временно недоступна" }),
    }),
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("alert")).toContainText(
    "Статистика временно недоступна",
  );
  await expect(page.locator(".teacher-overview strong").first()).toHaveText(
    "—",
  );
  await page.unroute("**/api/dashboard/stats");
  await page.getByRole("button", { name: "Обновить", exact: true }).click();
  await expect(page.locator(".teacher-overview strong").first()).not.toHaveText(
    "—",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  if (info.project.name === "mobile") {
    await expect(
      page.locator(".mobile-bottom-nav > a, .mobile-bottom-nav > button"),
    ).toHaveCount(5);
    await page.locator(".workspace-more").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Tab");
    expect(
      await page
        .getByRole("dialog")
        .evaluate((d) => d.contains(document.activeElement)),
    ).toBe(true);
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Викторины", exact: true })
      .click();
    await expect(page).toHaveURL(/\/quizzes$/);
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.goto("/dashboard");
    await page.setViewportSize({ width: 320, height: 740 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(2);
    await page.locator(".workspace-more").click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(page.locator(".workspace-more")).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await page.screenshot({
    path: `test-results/${info.project.name}-brand-teacher.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(2);
  await page.route("**/api/admin/ads/current", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ad: null }),
    }),
  );
  await page.goto("/marketplace");
  await page.getByRole("button", { name: "Пополнить", exact: false }).click();
  await expect(
    page.getByRole("heading", { name: "Нет активной рекламы", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Нет активной рекламы", exact: true }),
  ).toHaveCount(0);
});
test("teacher registration retains credentials between steps and enters the account without another login", async ({
  page,
}, info) => {
  await setup(page);
  await page.goto("/register");
  await page.getByLabel("Ваше имя", { exact: true }).fill("Brand Teacher");
  await page
    .getByLabel("Email", { exact: true })
    .fill(`brand-${info.project.name}-${Date.now()}@test.example`);
  await page.getByLabel("Пароль", { exact: true }).fill("Testing12345");
  await page
    .getByRole("checkbox", {
      name: "Я согласен с условиями использования и политикой конфиденциальности",
      exact: true,
    })
    .check();
  await page
    .getByLabel("Повторите пароль", { exact: true })
    .fill("Different123");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Пароли не совпадают");
  await page
    .getByLabel("Повторите пароль", { exact: true })
    .fill("Testing12345");
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByLabel("Математика", { exact: true }).check();
  await page.getByLabel("Физика", { exact: true }).check();
  await expect(page.getByLabel("Химия", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Назад", exact: true }).click();
  await expect(page.getByLabel("Ваше имя", { exact: true })).toHaveValue(
    "Brand Teacher",
  );
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator(".teacher-home")).toBeVisible();
  const credits = await page.evaluate(async () => {
    const r = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
      },
    });
    return (await r.json()).user.credits;
  });
  expect(credits).toBe(5);
});
test("brand entry pages remain consistent in both languages and themes, including a 320px viewport", async ({
  page,
}, info) => {
  const errors = [];
  const externalFonts = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url()))
      externalFonts.push(r.url());
  });
  await page.goto("/");
  const manifest = await (await page.request.get("/manifest.json")).json();
  expect(manifest.short_name).toBe("URPAQ");
  expect(manifest.theme_color).toBe("#245fb5");
  expect(manifest.start_url).toBe("/");
  expect(manifest.shortcuts.some((s) => s.url === "/student/dashboard")).toBe(
    true,
  );
  expect(
    await page.locator('meta[name="viewport"]').getAttribute("content"),
  ).not.toMatch(/user-scalable=no|maximum-scale/);
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      document.fonts.check("500 16px Inter", "Қазақ тілі, үй тапсырмасы"),
    ),
  ).toBe(true);
  for (const [language, theme] of [
    ["ru", "light"],
    ["kk", "dark"],
  ]) {
    await page.evaluate(
      ({ language, theme }) => {
        localStorage.setItem("urpaq_language", language);
        localStorage.setItem("urpaq_theme", theme);
      },
      { language, theme },
    );
    for (const path of [
      "/",
      "/login",
      "/register",
      "/forgot-password",
      "/reset-password",
      "/student/login",
    ]) {
      await page.goto(path);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      await expect(page.locator(".brand-mark").first()).toBeVisible();
      expect(
        await page
          .locator(".brand-mark img")
          .first()
          .evaluate((i) => i.naturalWidth),
      ).toBeGreaterThan(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        ),
        path,
      ).toBeLessThanOrEqual(2);
      expect(await page.locator("body").innerText()).not.toMatch(
        /5000\+|150K\+|15 часов/,
      );
    }
  }
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto("/");
  await page.getByRole("button", { name: "Оқушы", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Менің оқуым", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-brand-entry-320.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
  expect(externalFonts).toEqual([]);
});
