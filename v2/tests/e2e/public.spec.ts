import { expect, test } from "@playwright/test";
import { gotoPath, openSearch, waitForCars } from "./helpers";

const routeCases = [
  { path: "/", title: /SearchAnyCars/i, heading: /Find Your Perfect Used Car/i },
  { path: "/search", title: /Search Used Cars/i, heading: /Search Used Cars/i },
  { path: "/car/1", title: /Hyundai Creta/i, heading: /2022 Hyundai Creta SX\(O\)/i },
  { path: "/about", title: /About Us/i, heading: /About SearchAnyCars/i },
  { path: "/how-it-works", title: /How It Works/i, heading: /How It Works/i },
  { path: "/splus", title: /S-Plus/i, heading: /Luxury\. Curated\. Certified\./i },
  { path: "/splus-new", title: /S-Plus New/i, heading: /Factory Fresh\. Zero Owners\./i },
  { path: "/sell", title: /Sell Your Car/i, heading: /Sell Your Car/i },
  { path: "/faq", title: /Frequently Asked Questions/i, heading: /Frequently Asked Questions/i },
  { path: "/contact", title: /Contact/i, heading: /Contact Us/i },
  { path: "/login", title: /Sign In/i, heading: /SearchAnyCars/i },
  { path: "/forgot-password", title: /Forgot Password/i, heading: /SearchAnyCars/i, copy: /Reset your password/i },
  { path: "/reset-password", title: /Reset Password/i, heading: /SearchAnyCars/i, copy: /Invalid Reset Link/i },
  { path: "/wishlist", title: /Wishlist/i, heading: /My Wishlist/i },
  { path: "/definitely-missing", title: /SearchAnyCars/i, heading: /Page Not Found/i },
];

const headerNavCases = [
  { name: "Home", path: "/" },
  { name: "Buy Cars", path: "/search" },
  { name: "S-Plus", path: "/splus" },
  { name: "S-Plus New", path: "/splus-new" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "About Us", path: "/about" },
  { name: "FAQs", path: "/faq" },
  { name: "Contact", path: "/contact" },
];

const footerCases = [
  { name: "About Us", path: "/about" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "S-Plus Premium", path: "/splus" },
  { name: "S-Plus New", path: "/splus-new" },
  { name: "Contact Us", path: "/contact" },
  { name: "Hyundai", path: "/search?brand=Hyundai" },
  { name: "Tata", path: "/search?brand=Tata" },
  { name: "All Brands", path: "/search" },
  { name: "SUVs", path: "/search?body_style=SUV" },
  { name: "Sedans", path: "/search?body_style=Sedan" },
  { name: "Electric", path: "/search?fuel_type=Electric" },
  { name: "Warranty", path: "/faq" },
  { name: "Terms", path: "/faq" },
];

const mobileCases = [
  { name: "Home", path: "/" },
  { name: "Search", path: "/search" },
  { name: "S-Plus", path: "/splus" },
  { name: "New Cars", path: "/splus-new" },
  { name: "Wishlist", path: "/wishlist" },
  { name: "Login", path: "/login" },
];

const faqCases = [
  "What is SearchAnyCars?",
  "How are cars inspected?",
  "What is the 7-day money-back guarantee?",
  "What does the warranty cover?",
  "How does the reservation work?",
  "Do you offer financing/EMI options?",
  "Is the RC transfer included?",
  "What documents do I need?",
  "Can I sell my car on SearchAnyCars?",
  "How do I book a test drive?",
  "What is S-Plus Premium?",
  "Which cities do you serve?",
];

test.describe("public route coverage", () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await gotoPath(page, "/");
    await page.close();
  });

  for (const routeCase of routeCases) {
    test(`route ${routeCase.path} renders correctly`, async ({ page }) => {
      await gotoPath(page, routeCase.path);
      if (routeCase.path === "/" && (await page.getByText("Page Not Found").isVisible().catch(() => false))) {
        await page.reload({ waitUntil: "domcontentloaded" });
      }
      await expect(page).toHaveTitle(routeCase.title);
      await expect(page.locator("main").getByRole("heading", { name: routeCase.heading })).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
      if (routeCase.copy) {
        await expect(page.locator("main").getByText(routeCase.copy).first()).toBeVisible();
      }
    });
  }
});

test.describe("header navigation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoPath(page, "/");
  });

  for (const navCase of headerNavCases) {
    test(`header link ${navCase.name} navigates`, async ({ page }) => {
      await page.locator(".header-nav").getByRole("link", { name: navCase.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(navCase.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  }

  test("hero budget search navigates with a budget query", async ({ page }) => {
    await page.getByRole("button", { name: "Search by Budget" }).click();
    await page.getByRole("button", { name: /₹10-15L/i }).click();
    await page.getByRole("button", { name: "Find Your Car" }).click();
    await expect(page).toHaveURL(/listing_price_min=1000000/);
    await expect(page).toHaveURL(/listing_price_max=1500000/);
    await expect(page.getByRole("heading", { name: /Search Used Cars/i })).toBeVisible();
  });

  test("hero brand search opens a filtered search page", async ({ page }) => {
    await page.getByRole("button", { name: "Search by Brand" }).click();
    await page.locator(".search-brand-grid").getByRole("link", { name: /Hyundai Hyundai/i }).click();
    await expect(page).toHaveURL(/brand=Hyundai/);
    await expect(page.locator(".section-sm h1")).toContainText("Hyundai");
  });
});

test.describe("footer navigation", () => {
  test.beforeEach(async ({ page }) => {
    await gotoPath(page, "/");
  });

  for (const footerCase of footerCases) {
    test(`footer link ${footerCase.name} is reachable`, async ({ page }) => {
      const footer = page.locator("footer");
      await footer.getByRole("link", { name: footerCase.name }).first().click();
      await expect(page).toHaveURL(new RegExp(footerCase.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  }
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test.beforeEach(async ({ page }) => {
    await gotoPath(page, "/");
  });

  for (const mobileCase of mobileCases) {
    test(`mobile nav ${mobileCase.name} navigates`, async ({ page }) => {
      await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: mobileCase.name }).click();
      await expect(page).toHaveURL(new RegExp(mobileCase.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    });
  }
});

test.describe("page interactions", () => {
  for (const question of faqCases) {
    test(`FAQ item renders for "${question}"`, async ({ page }) => {
      await gotoPath(page, "/faq");
      await expect(page.locator(".faq-item", { hasText: question }).locator(".faq-question")).toBeVisible();
    });
  }

  test("contact form submits successfully", async ({ page }) => {
    await gotoPath(page, "/contact");
    await page.getByPlaceholder("Your name").fill("Codex QA");
    await page.getByPlaceholder("you@example.com").fill("contact@example.com");
    await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
    await page.getByPlaceholder("How can we help?").fill("Need help");
    await page.getByPlaceholder("Tell us more...").fill("Checking the contact workflow from Playwright.");
    await page.getByRole("button", { name: "Send Message" }).click();
    await expect(page.getByText("Message Sent!")).toBeVisible();
  });

  test("sell your car wizard completes all four steps", async ({ page }) => {
    await gotoPath(page, "/sell");
    await page.locator(".sell-form-card select").first().selectOption("Honda");
    await page.getByPlaceholder("e.g., Creta").fill("City");
    await page.getByRole("button", { name: /Next: Specs/i }).click();
    await page.getByPlaceholder("e.g., 45000").fill("25000");
    await page.getByRole("button", { name: /Next: Pricing/i }).click();
    await page.getByPlaceholder("e.g., 850000").fill("850000");
    await page.locator(".sell-form-card select").first().selectOption("Karnataka");
    await page.locator(".sell-form-card select").nth(1).selectOption("Bengaluru");
    await page.getByRole("button", { name: /Next: Photos/i }).click();
    await page.getByPlaceholder("Full name").fill("Codex Seller");
    await page.getByPlaceholder("10-digit mobile").fill("9876543210");
    await page.getByRole("button", { name: /List My Car for Sale/i }).click();
    await expect(page.getByText(/Car Listed Successfully!/i)).toBeVisible();
  });

  test("forgot password shows a confirmation state", async ({ page }) => {
    await gotoPath(page, "/forgot-password");
    await page.getByPlaceholder("you@example.com").fill("nobody@example.com");
    await page.getByRole("button", { name: "Send Reset Link" }).click();
    await expect(page.getByText(/Check your email/i)).toBeVisible();
  });

  test("my bookings prompts unauthenticated users to sign in", async ({ page }) => {
    await gotoPath(page, "/my-bookings");
    await expect(page.getByText(/Sign in to view your bookings/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
  });

  test("wishlist empty state is shown before anything is saved", async ({ page }) => {
    await gotoPath(page, "/wishlist");
    await expect(page.getByText(/Your wishlist is empty/i)).toBeVisible();
  });

  test("homepage featured inventory loads car cards", async ({ page }) => {
    await gotoPath(page, "/");
    await waitForCars(page);
    await expect(page.locator(".car-card")).toHaveCount(5);
  });

  test("search page can render an empty state with impossible filters", async ({ page }) => {
    await openSearch(page);
    await page.getByLabel("Brand filter").fill("DefinitelyMissingBrand");
    await expect(page.getByText(/No cars match your filters/i)).toBeVisible();
  });

  test("about page CTA leads to search", async ({ page }) => {
    await gotoPath(page, "/about");
    await page.getByRole("link", { name: "Browse Cars" }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test("how it works CTA leads to search", async ({ page }) => {
    await gotoPath(page, "/how-it-works");
    await page.getByRole("link", { name: "Start Browsing" }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test("wishlist empty-state CTA leads to search", async ({ page }) => {
    await gotoPath(page, "/wishlist");
    await page.getByRole("link", { name: "Browse Cars" }).click();
    await expect(page).toHaveURL(/\/search$/);
  });

  test("not-found page can navigate back home", async ({ page }) => {
    await gotoPath(page, "/definitely-missing");
    await page.getByRole("link", { name: "Back to Home" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("invalid reset password state links back to forgot password", async ({ page }) => {
    await gotoPath(page, "/reset-password");
    await page.getByRole("link", { name: "Request New Link" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});
