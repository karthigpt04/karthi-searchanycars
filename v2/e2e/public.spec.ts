import { expect, test } from '@playwright/test';
import { expectMainReady, gotoPath } from './helpers';

const desktopRoutes = [
  { path: '/', heading: 'Find Your Perfect Used Car' },
  { path: '/search', heading: 'Search Used Cars' },
  { path: '/splus', heading: 'S-Plus' },
  { path: '/splus-new', heading: 'S-Plus New' },
  { path: '/sell', heading: 'Sell' },
  { path: '/about', heading: 'About' },
  { path: '/how-it-works', heading: 'How It Works' },
  { path: '/faq', heading: 'Frequently Asked Questions' },
  { path: '/contact', heading: 'Contact' },
  { path: '/login', heading: 'SearchAnyCars' },
];

const mobileRoutes = [
  { path: '/', heading: 'Find Your Perfect Used Car' },
  { path: '/search', heading: 'Search Used Cars' },
  { path: '/splus', heading: 'S-Plus' },
  { path: '/splus-new', heading: 'S-Plus New' },
  { path: '/sell', heading: 'Sell' },
  { path: '/about', heading: 'About' },
  { path: '/how-it-works', heading: 'How It Works' },
  { path: '/faq', heading: 'Frequently Asked Questions' },
  { path: '/contact', heading: 'Contact' },
  { path: '/wishlist', heading: 'My Wishlist' },
];

const headerLinks = [
  { label: 'Buy Cars', path: '/search' },
  { label: 'S-Plus', path: '/splus' },
  { label: 'S-Plus New', path: '/splus-new' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'About Us', path: '/about' },
  { label: 'FAQs', path: '/faq' },
  { label: 'Contact', path: '/contact' },
];

const footerLinks = [
  { label: 'About Us', path: '/about' },
  { label: 'How It Works', path: '/how-it-works' },
  { label: 'S-Plus Premium', path: '/splus' },
  { label: 'S-Plus New', path: '/splus-new' },
  { label: 'Contact Us', path: '/contact' },
  { label: 'Maruti Suzuki', path: '/search?brand=Maruti+Suzuki' },
  { label: 'SUVs', path: '/search?body_style=SUV' },
  { label: 'FAQs', path: '/faq' },
];

test.describe('Public Routes', () => {
  for (const route of desktopRoutes) {
    test(`desktop route ${route.path} renders`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await gotoPath(page, route.path);
      await expectMainReady(page);
      await expect(page.getByText(route.heading, { exact: false }).first()).toBeVisible();
    });
  }

  for (const route of mobileRoutes) {
    test(`mobile route ${route.path} renders`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await gotoPath(page, route.path);
      await expectMainReady(page);
      await expect(page.getByText(route.heading, { exact: false }).first()).toBeVisible();
    });
  }
});

test.describe('Global Navigation', () => {
  test('brand link returns to home', async ({ page }) => {
    await gotoPath(page, '/search');
    await page.getByLabel('SearchAnyCars home').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Find Your Perfect Used Car')).toBeVisible();
  });

  for (const link of headerLinks) {
    test(`desktop header link ${link.label} navigates`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 1100 });
      await gotoPath(page, '/');
      await page.getByRole('link', { name: link.label }).first().click();
      await expect(page).toHaveURL(new RegExp(link.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expectMainReady(page);
    });
  }

  test('wishlist header icon navigates', async ({ page }) => {
    await gotoPath(page, '/');
    await page.getByRole('link', { name: 'Wishlist' }).click();
    await expect(page).toHaveURL(/\/wishlist$/);
    await expect(page.getByText('My Wishlist')).toBeVisible();
  });

  test('find cars header CTA navigates', async ({ page }) => {
    await gotoPath(page, '/');
    await page.getByRole('link', { name: 'Find Cars' }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test('mobile nav exposes key destinations', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPath(page, '/');
    for (const label of ['Home', 'Search', 'S-Plus', 'New Cars', 'Wishlist', 'Login']) {
      await expect(page.getByRole('link', { name: label })).toBeVisible();
    }
  });

  test('mobile menu toggle opens and closes the header drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPath(page, '/');
    const toggle = page.getByLabel('Toggle menu');
    await toggle.click();
    await expect(page.getByRole('link', { name: 'Contact' })).toBeVisible();
    await toggle.click();
    await expect(page.locator('.header-backdrop')).toHaveCount(0);
  });
});

test.describe('Homepage', () => {
  test('budget search hero submits to search route', async ({ page }) => {
    await gotoPath(page, '/');
    await page.getByRole('button', { name: '₹5-8L' }).click();
    await page.getByRole('button', { name: /Select Cities/ }).click();
    await page.getByLabel('Mumbai').check();
    await page.getByRole('button', { name: 'Find Your Car' }).click();
    await expect(page).toHaveURL(/\/search\?/);
    await expect(page).toHaveURL(/listing_price_min=500000/);
    await expect(page).toHaveURL(/listing_price_max=800000/);
    await expect(page).toHaveURL(/location_city=Mumbai/);
  });

  test('brand search tab exposes brand links', async ({ page }) => {
    await gotoPath(page, '/');
    await page.getByRole('button', { name: 'Search by Brand' }).click();
    await expect(page.getByRole('link', { name: 'Hyundai' })).toBeVisible();
    await page.getByRole('link', { name: 'Hyundai' }).click();
    await expect(page).toHaveURL(/brand=Hyundai/);
  });

  test('featured car cards link to detail pages', async ({ page }) => {
    await gotoPath(page, '/');
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
    await page.getByRole('link', { name: /2022 Hyundai Creta SX\(O\)/ }).first().click();
    await expect(page).toHaveURL(/\/car\/1$/);
    await expect(page.getByText('Book Test Drive')).toBeVisible();
  });

  test('homepage sections render with data-driven content', async ({ page }) => {
    await gotoPath(page, '/');
    for (const section of [
      'Browse by Body Type',
      'Featured Cars',
      'Browse Cars by Brand',
      'How It Works',
      'Cities We Serve',
      'Customer Reviews',
    ]) {
      await expect(page.getByText(section, { exact: false })).toBeVisible();
    }
  });

  test('city browser cards navigate into search', async ({ page }) => {
    await gotoPath(page, '/');
    await page.getByRole('link', { name: /Mumbai/i }).first().click();
    await expect(page).toHaveURL(/\/search/);
  });

  test('trust bar renders seeded benefits', async ({ page }) => {
    await gotoPath(page, '/');
    for (const benefit of [
      '200+ Point Inspection',
      '7-Day Money Back',
      '1-Year Warranty',
      'Free RC Transfer',
    ]) {
      await expect(page.getByText(benefit)).toBeVisible();
    }
  });
});

test.describe('Search Experience', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPath(page, '/search');
  });

  test('loads seeded listings and count', async ({ page }) => {
    await expect(page.getByText(/cars found/i)).toBeVisible();
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
    await expect(page.getByText('2023 Kia Seltos HTX+')).toBeVisible();
  });

  test('brand filter narrows results', async ({ page }) => {
    await page.getByLabel('Brand filter').fill('Hyundai');
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
    await expect(page.getByText('2023 Kia Seltos HTX+')).toHaveCount(0);
  });

  test('fuel type filter narrows results', async ({ page }) => {
    await page.getByRole('button', { name: 'Petrol' }).click();
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
  });

  test('transmission filter narrows results', async ({ page }) => {
    await page.getByRole('button', { name: 'CVT' }).click();
    await expect(page.getByText('2022 Honda City ZX CVT')).toBeVisible();
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toHaveCount(0);
  });

  test('body type filter narrows results', async ({ page }) => {
    await page.getByRole('button', { name: 'Sedan' }).click();
    await expect(page.getByText('2022 Honda City ZX CVT')).toBeVisible();
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toHaveCount(0);
  });

  test('quick tag low KM keeps low-mileage cars', async ({ page }) => {
    await page.getByRole('button', { name: 'Low KM' }).click();
    await expect(page.getByText('2023 Kia Seltos HTX+')).toBeVisible();
  });

  test('quick tag single owner keeps first-owner cars', async ({ page }) => {
    await page.getByRole('button', { name: 'Single Owner' }).click();
    await expect(page.getByText('2022 Hyundai Creta SX(O)')).toBeVisible();
  });

  test('clear all resets typed filters', async ({ page }) => {
    await page.getByLabel('Brand filter').fill('Honda');
    await page.getByRole('button', { name: 'Clear All' }).click();
    await expect(page.getByLabel('Brand filter')).toHaveValue('');
  });

  test('mobile filter drawer opens', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoPath(page, '/search');
    await page.getByRole('button', { name: /Filters/ }).click();
    await expect(page.getByText('Filters')).toBeVisible();
    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.locator('.filter-panel-open')).toHaveCount(0);
  });

  test('car card detail CTA opens detail page', async ({ page }) => {
    await page.getByRole('link', { name: 'View' }).first().click();
    await expect(page).toHaveURL(/\/car\/\d+$/);
  });
});

test.describe('Car Detail Experience', () => {
  test.beforeEach(async ({ page }) => {
    await gotoPath(page, '/car/1');
  });

  test('renders breadcrumb and core CTAs', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Used Cars' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book Test Drive' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reserve This Car' })).toBeVisible();
  });

  test('gallery navigation changes the image counter', async ({ page }) => {
    await expect(page.getByText('1 / 3')).toBeVisible();
    await page.getByLabel('Next image').click();
    await expect(page.getByText('2 / 3')).toBeVisible();
    await page.getByLabel('Previous image').click();
    await expect(page.getByText('1 / 3')).toBeVisible();
  });

  test('gallery thumbnails are selectable', async ({ page }) => {
    await page.locator('.gallery-thumb').nth(1).click();
    await expect(page.getByText('2 / 3')).toBeVisible();
  });

  test('fullscreen gallery opens and closes', async ({ page }) => {
    await page.getByLabel('Fullscreen').click();
    await expect(page.locator('.fullscreen-gallery')).toBeVisible();
    await page.getByRole('button', { name: '✕' }).last().click();
    await expect(page.locator('.fullscreen-gallery')).toHaveCount(0);
  });

  test('renders overview and specification sections', async ({ page }) => {
    for (const section of [
      'Car Overview',
      'Detailed Specifications',
      'Features',
      'Inspection Report',
      'EMI Calculator',
      'Warranty & Trust',
      'Similar Cars',
    ]) {
      await expect(page.getByText(section, { exact: false })).toBeVisible();
    }
  });

  test('spec accordion toggles safety features', async ({ page }) => {
    await page.getByRole('button', { name: /Safety Features/ }).click();
    await expect(page.getByText('ISOFIX')).toBeVisible();
  });

  test('EMI calculator reacts to sliders', async ({ page }) => {
    const before = await page.locator('.emi-monthly').textContent();
    await page.locator('input[type="range"]').first().fill('40');
    const after = await page.locator('.emi-monthly').textContent();
    expect(after).not.toBe(before);
  });

  test('save button toggles wishlist text', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Save/ })).toBeVisible();
    await page.getByRole('button', { name: /Save/ }).click();
    await expect(page.getByRole('button', { name: /Saved/ })).toBeVisible();
  });

  test('test drive modal opens with required inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Book Test Drive' }).click();
    await expect(page.getByText('Book Test Drive')).toBeVisible();
    for (const label of ['Full Name *', 'Phone Number *', 'Preferred Date *', 'Time Slot *']) {
      await expect(page.getByText(label)).toBeVisible();
    }
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Book Test Drive')).toHaveCount(0);
  });

  test('reserve modal opens with required inputs', async ({ page }) => {
    await page.getByRole('button', { name: 'Reserve This Car' }).click();
    await expect(page.getByText('Reserve This Car')).toBeVisible();
    for (const label of ['Full Name *', 'Phone *', 'Email *', 'City']) {
      await expect(page.getByText(label)).toBeVisible();
    }
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Reserve This Car')).toHaveCount(0);
  });
});
