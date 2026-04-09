import { expect, test } from '@playwright/test';
import {
  createUserViaApi,
  gotoPath,
  loginViaUi,
  logoutIfVisible,
  makeUserCredentials,
  registerViaUi,
  tomorrowDate,
} from './helpers';

test.describe.serial('User Flows', () => {
  const reusableUser = makeUserCredentials();
  const uiRegisteredUser = makeUserCredentials();
  let activePassword = reusableUser.password;

  test.beforeAll(async () => {
    await createUserViaApi(reusableUser);
  });

  test('my bookings page gates unauthenticated users', async ({ page }) => {
    await gotoPath(page, '/my-bookings');
    await expect(page.getByText('Sign in to view your bookings')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  });

  test('forgot password flow shows a confirmation state', async ({ page }) => {
    await gotoPath(page, '/forgot-password');
    await page.locator('input[type="email"]').fill(reusableUser.email);
    await page.getByRole('button', { name: 'Send Reset Link' }).click();
    await expect(page.getByText('Check your email')).toBeVisible();
  });

  test('reset password without token shows invalid-link state', async ({ page }) => {
    await gotoPath(page, '/reset-password');
    await expect(page.getByText('Invalid Reset Link')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request New Link' })).toBeVisible();
  });

  test('registration via UI creates a new account', async ({ page }) => {
    await registerViaUi(page, uiRegisteredUser);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
    await logoutIfVisible(page);
  });

  test('login via UI works for a prepared user', async ({ page }) => {
    await loginViaUi(page, reusableUser.email, activePassword);
    await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible();
  });

  test('change password validates mismatched values', async ({ page }) => {
    await loginViaUi(page, reusableUser.email, activePassword);
    await gotoPath(page, '/change-password');
    await page.getByPlaceholder('Enter current password').fill(activePassword);
    await page.getByPlaceholder('Min 6 characters').fill(`${activePassword}-new`);
    await page.getByPlaceholder('Re-enter new password').fill(`${activePassword}-different`);
    await page.getByRole('button', { name: 'Change Password' }).click();
    await expect(page.getByText('New passwords do not match')).toBeVisible();
  });

  test('change password succeeds for an authenticated user', async ({ page }) => {
    const nextPassword = `${activePassword}-updated`;
    await loginViaUi(page, reusableUser.email, activePassword);
    await gotoPath(page, '/change-password');
    await page.getByPlaceholder('Enter current password').fill(activePassword);
    await page.getByPlaceholder('Min 6 characters').fill(nextPassword);
    await page.getByPlaceholder('Re-enter new password').fill(nextPassword);
    await page.getByRole('button', { name: 'Change Password' }).click();
    await expect(page.getByText('Password Changed')).toBeVisible();
    activePassword = nextPassword;
  });

  test('guest wishlist updates locally and renders on the wishlist page', async ({ page }) => {
    await gotoPath(page, '/search');
    await page.getByRole('button', { name: /Add 2022 Hyundai Creta SX\(O\) to wishlist/ }).click();
    await gotoPath(page, '/wishlist');
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
  });

  test('logged-in wishlist syncs through the API', async ({ page }) => {
    await loginViaUi(page, reusableUser.email, activePassword);
    await gotoPath(page, '/search');
    await page.getByRole('button', { name: /Add 2023 Kia Seltos HTX\+ to wishlist/ }).click();
    await gotoPath(page, '/wishlist');
    await expect(page.getByText('2023 Kia Seltos HTX+')).toBeVisible();
  });

  test('guest test drive modal can be completed as a UI-only flow', async ({ page }) => {
    await gotoPath(page, '/car/1');
    await page.getByRole('button', { name: 'Book Test Drive' }).click();
    await page.getByPlaceholder('Enter your full name').fill('Guest User');
    await page.getByPlaceholder('+91 98765 43210').fill('+919876543210');
    await page.locator('input[type="date"]').fill(tomorrowDate());
    await page.getByRole('combobox').selectOption('10am-12pm');
    await page.getByRole('button', { name: 'Confirm Booking' }).click();
    await expect(page.getByText('Test Drive Booked!')).toBeVisible();
  });

  test('authenticated test drive creates a booking that appears in my bookings', async ({ page }) => {
    await loginViaUi(page, reusableUser.email, activePassword);
    await gotoPath(page, '/car/1');
    await page.getByRole('button', { name: 'Book Test Drive' }).click();
    await page.getByPlaceholder('Enter your full name').fill(reusableUser.name);
    await page.getByPlaceholder('+91 98765 43210').fill('+919812345678');
    await page.locator('input[type="date"]').fill(tomorrowDate());
    await page.getByRole('combobox').selectOption('12pm-2pm');
    await page.getByRole('button', { name: 'Confirm Booking' }).click();
    await expect(page.getByText('Test Drive Booked!')).toBeVisible();

    await gotoPath(page, '/my-bookings');
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Booking' })).toBeVisible();
  });

  test('booking cancellation handles the confirm dialog and updates the status', async ({ page }) => {
    await loginViaUi(page, reusableUser.email, activePassword);
    await gotoPath(page, '/my-bookings');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Cancel Booking' }).click();
    await expect(page.getByText('Cancelled')).toBeVisible();
  });
});
