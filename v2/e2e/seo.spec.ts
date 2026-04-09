import { expect, test } from '@playwright/test';
import { gotoPath } from './helpers';

test.describe('SEO And Platform Endpoints', () => {
  test('home page sets a title', async ({ page }) => {
    await gotoPath(page, '/');
    await expect(page).toHaveTitle(/SearchAnyCars/i);
  });

  test('search page sets a title', async ({ page }) => {
    await gotoPath(page, '/search');
    await expect(page).toHaveTitle(/Search|Used Cars/i);
  });

  test('car detail page sets a title', async ({ page }) => {
    await gotoPath(page, '/car/1');
    await expect(page).toHaveTitle(/Hyundai Creta|SearchAnyCars/i);
  });

  test('home page exposes a canonical link', async ({ page }) => {
    await gotoPath(page, '/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /searchanycars\.com|localhost/);
  });

  test('search page exposes a canonical link', async ({ page }) => {
    await gotoPath(page, '/search');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /searchanycars\.com|localhost/);
  });

  test('car detail page exposes a canonical link', async ({ page }) => {
    await gotoPath(page, '/car/1');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /car\/1/);
  });

  test('home page ships organization JSON-LD', async ({ page }) => {
    await gotoPath(page, '/');
    await expect(page.locator('script[type="application/ld+json"]')).toContainText('Organization');
  });

  test('search page ships item-list JSON-LD', async ({ page }) => {
    await gotoPath(page, '/search');
    await expect(page.locator('script[type="application/ld+json"]')).toContainText('ItemList');
  });

  test('faq page ships FAQ JSON-LD', async ({ page }) => {
    await gotoPath(page, '/faq');
    await expect(page.locator('script[type="application/ld+json"]')).toContainText('FAQPage');
  });

  test('home page exposes open graph metadata', async ({ page }) => {
    await gotoPath(page, '/');
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /SearchAnyCars/i);
  });

  test('robots endpoint loads and blocks private areas', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/robots.txt');
    const body = await response.text();
    expect(response.ok()).toBeTruthy();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /api');
  });

  test('sitemap endpoint loads and includes key routes', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/sitemap.xml');
    const body = await response.text();
    expect(response.ok()).toBeTruthy();
    expect(body).toContain('/search');
    expect(body).toContain('/car/1');
  });
});
