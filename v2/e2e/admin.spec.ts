import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  createUserViaApi,
  gotoPath,
  loginViaUi,
  logoutIfVisible,
  makeUserCredentials,
  tomorrowDate,
} from './helpers';

test.describe.serial('Admin Flows', () => {
  const nonAdminUser = makeUserCredentials();
  const bookingUser = makeUserCredentials();
  const listingModel = `CodexModel${Date.now().toString(36)}`;
  const listingTitle = `${new Date().getFullYear()} Honda ${listingModel}`;

  const field = (page: Page, label: string) =>
    page.locator('.adm-field', { hasText: label });

  test.beforeAll(async () => {
    await createUserViaApi(nonAdminUser);
    await createUserViaApi(bookingUser);
  });

  test('admin page requires authentication', async ({ page }) => {
    await gotoPath(page, '/admin');
    await expect(page.getByText('Login Required')).toBeVisible();
    await expect(page.getByText('You need to sign in to access the admin dashboard.')).toBeVisible();
  });

  test('admin page denies non-admin users', async ({ page }) => {
    await loginViaUi(page, nonAdminUser.email, nonAdminUser.password);
    await gotoPath(page, '/admin');
    await expect(page.getByText('Access Denied')).toBeVisible();
    await expect(page.getByText('You need admin privileges to access this page.')).toBeVisible();
  });

  test('admin inventory dashboard loads for admin', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await expect(page.getByText('Inventory Dashboard')).toBeVisible();
    await expect(page.getByText('Total Cars')).toBeVisible();
    await expect(page.getByRole('link', { name: '+ List New Car' })).toBeVisible();
  });

  test('inventory search filters the listing table', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByPlaceholder('Search by title, brand, code, city...').fill('Honda City');
    await expect(page.getByText('2022 Honda City ZX CVT')).toBeVisible();
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toHaveCount(0);
  });

  test('inventory status filters are clickable', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByRole('button', { name: /Active \(/ }).click();
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
  });

  test('new car form opens with expected sections', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin/car/new');
    for (const text of [
      'List New Car',
      'Basic Information',
      'Pricing',
      'Location',
      'Media',
      'Status',
      'Publish Listing',
    ]) {
      await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
    }
  });

  test('new car form shows core field labels', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin/car/new');
    for (const label of [
      'Brand *',
      'Model *',
      'Manufacturing Year',
      'Registration Year',
      'Category',
      'Title *',
      'Listing Code *',
      'Body Type',
      'Exterior Color',
    ]) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
  });

  test('admin can create a new listing', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin/car/new');
    await field(page, 'Brand *').locator('select').selectOption('Honda');
    await field(page, 'Model *').locator('input').fill(listingModel);
    await field(page, 'Category').locator('select').selectOption({ index: 1 });
    await page.getByRole('button', { name: /Location & Registration/ }).click();
    await field(page, 'Location City').locator('input').fill('Tokyo');
    await page.getByRole('button', { name: 'Publish Listing' }).click();
    await expect(page.getByText('Listing created successfully!')).toBeVisible();
  });

  test('created listing appears in admin inventory', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByPlaceholder('Search by title, brand, code, city...').fill(listingModel);
    await expect(page.getByText(listingTitle, { exact: false })).toBeVisible();
  });

  test('edit page opens for the created listing', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByPlaceholder('Search by title, brand, code, city...').fill(listingModel);
    await page.getByRole('link', { name: 'Edit' }).first().click();
    await expect(page.getByText('Edit Listing')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Listing' })).toBeVisible();
  });

  test('admin can update the created listing', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByPlaceholder('Search by title, brand, code, city...').fill(listingModel);
    await page.getByRole('link', { name: 'Edit' }).first().click();
    await field(page, 'Variant').locator('input').fill('QA Edition');
    await page.getByRole('button', { name: 'Update Listing' }).click();
    await expect(page.getByText('Listing updated successfully!')).toBeVisible();
  });

  test('delete action exposes confirm and cancel controls', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByPlaceholder('Search by title, brand, code, city...').fill(listingModel);
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await expect(page.getByRole('button', { name: 'Confirm' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('delete cancel leaves the listing in place', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByPlaceholder('Search by title, brand, code, city...').fill(listingModel);
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText(listingTitle, { exact: false })).toBeVisible();
  });

  test('admin can delete the created listing', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByPlaceholder('Search by title, brand, code, city...').fill(listingModel);
    await page.getByRole('button', { name: 'Delete' }).first().click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByText('Listing deleted successfully.')).toBeVisible();
  });

  test('bookings tab loads in the admin dashboard', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByRole('button', { name: 'Bookings' }).click();
    await expect(page.getByText('Test Drive Bookings')).toBeVisible();
  });

  test('admin can update a booking status', async ({ page }) => {
    await loginViaUi(page, bookingUser.email, bookingUser.password);
    await gotoPath(page, '/car/2');
    await page.getByRole('button', { name: 'Book Test Drive' }).click();
    await page.getByPlaceholder('Enter your full name').fill(bookingUser.name);
    await page.getByPlaceholder('+91 98765 43210').fill('+919700000001');
    await page.locator('input[type="date"]').fill(tomorrowDate());
    await page.getByRole('combobox').selectOption('2pm-4pm');
    await page.getByRole('button', { name: 'Confirm Booking' }).click();
    await expect(page.getByText('Test Drive Booked!')).toBeVisible();
    await logoutIfVisible(page);

    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin');
    await page.getByRole('button', { name: 'Bookings' }).click();
    await expect(page.getByText('2023 Maruti Suzuki Baleno Alpha')).toBeVisible();
    await page.locator('select').last().selectOption('confirmed');
    await page.getByRole('button', { name: 'Update' }).last().click();
    await expect(page.getByText('✓')).toBeVisible();
  });

  const settingsTabs = [
    'Hero Section',
    'Trust Bar',
    'Cities',
    'Reviews',
    'Body Types',
    'Fuel Types',
    'Budgets',
    'Navigation',
    'Footer',
    'Contact Info',
  ];

  for (const label of settingsTabs) {
    test(`settings tab ${label} opens`, async ({ page }) => {
      await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
      await gotoPath(page, '/admin/settings');
      await page.getByRole('button', { name: new RegExp(label) }).click();
      await expect(page.getByRole('button', { name: new RegExp(`Save ${label}`) })).toBeVisible();
    });
  }

  test('site name setting can be saved', async ({ page }) => {
    await loginViaUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    await gotoPath(page, '/admin/settings');
    await page.getByRole('button', { name: /Site Name/ }).click();
    const input = page.locator('.adm-s-field', { hasText: 'Site Name' }).locator('input');
    const original = await input.inputValue();
    const updated = `${original} QA`;
    await input.fill(updated);
    await page.getByRole('button', { name: 'Save Site Name' }).click();
    await expect(page.getByText('Site Name saved!')).toBeVisible();
    await input.fill(original);
    await page.getByRole('button', { name: 'Save Site Name' }).click();
    await expect(page.getByText('Site Name saved!')).toBeVisible();
  });
});
