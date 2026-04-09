import { expect, Page } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@searchanycars.com';
export const ADMIN_PASSWORD = 'admin123';
export const API_BASE = 'http://localhost:4000';

export function makeUserCredentials() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    name: `Codex User ${suffix}`,
    email: `codex-user-${suffix}@example.com`,
    password: `Codex!${suffix}`,
  };
}

export function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

export async function gotoPath(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);
}

export async function expectMainReady(page: Page) {
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('text=404')).toHaveCount(0);
}

export async function loginViaUi(page: Page, email: string, password: string) {
  await gotoPath(page, '/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL('**/', { timeout: 20_000 });
  await expect(page.getByRole('link', { name: 'Wishlist' })).toBeVisible();
}

export async function registerViaUi(
  page: Page,
  credentials: { name: string; email: string; password: string }
) {
  await gotoPath(page, '/login');
  await page.getByRole('button', { name: 'Register' }).first().click();
  await page.getByPlaceholder('Enter your name').fill(credentials.name);
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await page.waitForURL('**/', { timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
}

export async function logoutIfVisible(page: Page) {
  const logout = page.getByRole('button', { name: 'Logout' });
  if (await logout.isVisible().catch(() => false)) {
    await logout.click();
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
  }
}

export async function createUserViaApi(credentials: {
  name: string;
  email: string;
  password: string;
}) {
  const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(`Failed to create user ${credentials.email}: ${response.status}`);
  }
}
