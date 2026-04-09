import { expect, type Page } from "@playwright/test";

export const regularUser = {
  email: `codex-user-${Date.now()}@example.com`,
  password: "codexPass123",
  updatedPassword: "codexPass456",
  name: "Codex User",
};

export const adminUser = {
  email: "admin@searchanycars.com",
  password: "admin123",
};

export const listingDraft = {
  code: `COD-${Date.now()}`,
  title: `Codex QA Listing ${Date.now()}`,
  updatedTitle: `Codex QA Listing Updated ${Date.now()}`,
  brand: "Honda",
  model: "Amaze",
};

export function isoDateFromToday(daysAhead = 2) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split("T")[0];
}

export async function gotoPath(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible();
}

export async function waitForCars(page: Page) {
  await expect
    .poll(async () => page.locator(".car-card").count(), {
      message: "waiting for car cards to render",
    })
    .toBeGreaterThan(0);
}

export async function openSearch(page: Page, path = "/search") {
  await gotoPath(page, path);
  await waitForCars(page);
  await expect(page.getByText(/cars found/i)).toBeVisible();
}

export async function registerUser(page: Page, email: string, password: string, name: string) {
  await gotoPath(page, "/login");
  await page.locator(".login-tabs").getByRole("button", { name: "Register" }).click();
  await page.getByPlaceholder("Enter your name").fill(name);
  await page.locator('.login-form input[type="email"]').fill(email);
  await page.locator('.login-form input[type="password"]').fill(password);
  await page.locator(".login-form").getByRole("button", { name: /Create Account/i }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
}

export async function login(page: Page, email: string, password: string) {
  await gotoPath(page, "/login");
  await page.locator('.login-form input[type="email"]').fill(email);
  await page.locator('.login-form input[type="password"]').fill(password);
  await page.locator(".login-form").getByRole("button", { name: /^Sign In$/ }).click();
  await expect(page).toHaveURL(/\/$/);
}

export async function logout(page: Page) {
  const logoutButton = page.getByRole("button", { name: "Logout" });
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
  }
  await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
}

export async function addFirstSearchResultToWishlist(page: Page) {
  await openSearch(page);
  const firstCard = page.locator(".car-card").first();
  await firstCard.getByRole("button", { name: /wishlist/i }).click();
  return firstCard.getByRole("heading").textContent();
}

export async function createBookingFromDetail(page: Page) {
  await gotoPath(page, "/car/1");
  await expect(page.getByRole("heading", { name: /2022 Hyundai Creta SX\(O\)/i })).toBeVisible();
  await page.getByRole("button", { name: "Book Test Drive" }).click();
  await expect(page.getByRole("heading", { name: "Book Test Drive" })).toBeVisible();
  await page.getByPlaceholder("Enter your full name").fill(regularUser.name);
  await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
  await page.locator('.modal input[type="date"]').fill(isoDateFromToday());
  await page.locator(".modal select").selectOption("10am-12pm");
  await page.getByRole("radio", { name: /Home Test Drive/i }).check();
  await page.getByRole("button", { name: "Confirm Booking" }).click();
  await expect(page.getByText(/Test Drive Booked!/i)).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
}

export async function loginAsAdmin(page: Page) {
  await login(page, adminUser.email, adminUser.password);
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
}
