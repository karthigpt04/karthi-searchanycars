import { expect, test } from "@playwright/test";
import {
  addFirstSearchResultToWishlist,
  createBookingFromDetail,
  gotoPath,
  isoDateFromToday,
  listingDraft,
  login,
  loginAsAdmin,
  logout,
  openSearch,
  regularUser,
  registerUser,
  waitForCars,
} from "./helpers";

test.describe("discovery and detail flows", () => {
  test("search brand filter reduces the result set", async ({ page }) => {
    await openSearch(page);
    await page.getByLabel("Brand filter").fill("Hyundai");
    await expect(page.getByText(/1 cars found/i)).toBeVisible();
    await expect(page.locator(".car-card").first()).toContainText("Hyundai");
  });

  test("search city filter adds an active filter pill", async ({ page }) => {
    await openSearch(page);
    await page.getByRole("button", { name: "Mumbai" }).click();
    await expect(page.locator(".active-filter-pill")).toContainText("Mumbai");
  });

  test("search price preset filters results", async ({ page }) => {
    await openSearch(page);
    await page.getByRole("button", { name: "₹10-15L" }).click();
    await expect(page.getByText(/2 cars found/i)).toBeVisible();
  });

  test("search body type filter keeps only sedans", async ({ page }) => {
    await openSearch(page);
    await page.getByRole("button", { name: "Sedan", exact: true }).click();
    await expect(page.locator(".active-filter-pill")).toContainText("Sedan");
    await expect(page.getByText(/1 cars found/i)).toBeVisible();
    await expect(page.locator(".car-card").first()).toContainText("Honda City");
  });

  test("search quick tag low KM updates the result set", async ({ page }) => {
    await openSearch(page);
    await page.getByRole("button", { name: "Low KM" }).click();
    await expect(page.getByText(/4 cars found/i)).toBeVisible();
  });

  test("search clear filters resets the active pills", async ({ page }) => {
    await openSearch(page);
    await page.getByLabel("Brand filter").fill("Honda");
    await expect(page.locator(".active-filter-pill")).toContainText("Honda");
    await page.getByRole("button", { name: "Clear All" }).click();
    await expect(page.locator(".active-filter-pill")).toHaveCount(0);
  });

  test("car detail gallery supports next, previous, and thumbnail selection", async ({ page }) => {
    await gotoPath(page, "/car/1");
    await expect(page.getByRole("heading", { name: /2022 Hyundai Creta SX\(O\)/i })).toBeVisible();
    const counter = page.locator(".gallery-counter");
    await expect(counter).toHaveText("1 / 3");
    await page.getByRole("button", { name: "Next image" }).click();
    await expect(counter).toHaveText("2 / 3");
    await page.getByRole("button", { name: "Previous image" }).click();
    await expect(counter).toHaveText("1 / 3");
    await page.locator(".gallery-thumb").nth(2).click();
    await expect(counter).toHaveText("3 / 3");
  });

  test("guest users can submit the visible book test drive form state", async ({ page }) => {
    await gotoPath(page, "/car/1");
    await expect(page.getByRole("heading", { name: /2022 Hyundai Creta SX\(O\)/i })).toBeVisible();
    await page.getByRole("button", { name: "Book Test Drive" }).click();
    await expect(page.getByText(/Sign in to save your booking/i)).toBeVisible();
    await page.getByPlaceholder("Enter your full name").fill("Guest User");
    await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
    await page.locator('.modal input[type="date"]').fill(isoDateFromToday());
    await page.locator(".modal select").selectOption("2pm-4pm");
    await page.getByRole("button", { name: "Confirm Booking" }).click();
    await expect(page.getByText(/Test Drive Booked!/i)).toBeVisible();
  });

  test("reserve this car modal completes successfully", async ({ page }) => {
    await gotoPath(page, "/car/1");
    await page.getByRole("button", { name: "Reserve This Car" }).click();
    await page.getByPlaceholder("Enter your full name").fill("Codex Buyer");
    await page.getByPlaceholder("+91 98765 43210").fill("9876543210");
    await page.getByPlaceholder("you@example.com").fill("buyer@example.com");
    await page.getByPlaceholder("Your city").fill("Bengaluru");
    await page.locator(".modal-footer").getByRole("button", { name: /Reserve/i }).click();
    await expect(page.getByText(/Car Reserved!/i)).toBeVisible();
  });

  test("EMI calculator updates when the sliders move", async ({ page }) => {
    await gotoPath(page, "/car/1");
    const emiValue = page.locator(".emi-monthly");
    const original = await emiValue.textContent();
    await page.locator('input[type="range"]').first().fill("40");
    await expect(emiValue).not.toHaveText(original || "");
  });

  test("detail page renders similar cars", async ({ page }) => {
    await gotoPath(page, "/car/1");
    await expect(page.getByRole("heading", { name: "Similar Cars" })).toBeVisible();
    await expect
      .poll(async () => page.locator(".similar-section .car-card").count())
      .toBeGreaterThan(0);
  });

  test("wishlist add and remove works from search results", async ({ page }) => {
    const title = await addFirstSearchResultToWishlist(page);
    await gotoPath(page, "/wishlist");
    await expect(page.locator(".car-card").first()).toContainText(title || "");
    await page.locator(".car-card").first().getByRole("button", { name: /wishlist/i }).click();
    await expect(page.getByText(/Your wishlist is empty/i)).toBeVisible();
  });

  test("wishlist add and remove works from the detail page", async ({ page }) => {
    await gotoPath(page, "/car/1");
    await page.getByRole("button", { name: /Save/i }).click();
    await gotoPath(page, "/wishlist");
    await expect(page.locator(".car-card")).toHaveCount(1);
    await page.locator(".car-card").first().getByRole("button", { name: /wishlist/i }).click();
    await expect(page.getByText(/Your wishlist is empty/i)).toBeVisible();
  });
});

test.describe.serial("user authentication flows", () => {
  test("registers a new user", async ({ page }) => {
    await registerUser(page, regularUser.email, regularUser.password, regularUser.name);
  });

  test("logs out cleanly after registration", async ({ page }) => {
    await login(page, regularUser.email, regularUser.password);
    await logout(page);
  });

  test("shows an error for invalid credentials", async ({ page }) => {
    await gotoPath(page, "/login");
    await page.locator('.login-form input[type="email"]').fill(regularUser.email);
    await page.locator('.login-form input[type="password"]').fill("wrong-password");
    await page.getByRole("button", { name: /^Sign In$/ }).click();
    await expect(page.getByText(/Invalid email or password/i)).toBeVisible();
  });

  test("denies admin access to a regular user", async ({ page }) => {
    await login(page, regularUser.email, regularUser.password);
    await gotoPath(page, "/admin");
    await expect(page.getByText(/Access Denied/i)).toBeVisible();
  });

  test("change password validation rejects mismatched inputs", async ({ page }) => {
    await login(page, regularUser.email, regularUser.password);
    await gotoPath(page, "/change-password");
    await page.getByPlaceholder("Enter current password").fill(regularUser.password);
    await page.getByPlaceholder("Min 6 characters").fill(regularUser.updatedPassword);
    await page.getByPlaceholder("Re-enter new password").fill("different123");
    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText(/New passwords do not match/i)).toBeVisible();
  });

  test("changes the password successfully", async ({ page }) => {
    await login(page, regularUser.email, regularUser.password);
    await gotoPath(page, "/change-password");
    await page.getByPlaceholder("Enter current password").fill(regularUser.password);
    await page.getByPlaceholder("Min 6 characters").fill(regularUser.updatedPassword);
    await page.getByPlaceholder("Re-enter new password").fill(regularUser.updatedPassword);
    await page.getByRole("button", { name: "Change Password" }).click();
    await expect(page.getByText(/Password Changed/i)).toBeVisible();
  });

  test("logs in with the updated password", async ({ page }) => {
    await login(page, regularUser.email, regularUser.updatedPassword);
    await expect(page.getByRole("link", { name: "My Bookings" })).toBeVisible();
  });

  test("creates a real authenticated booking", async ({ page }) => {
    await login(page, regularUser.email, regularUser.updatedPassword);
    await createBookingFromDetail(page);
  });

  test("shows the booking in the My Bookings page", async ({ page }) => {
    await login(page, regularUser.email, regularUser.updatedPassword);
    await gotoPath(page, "/my-bookings");
    await expect(page.getByText(/2022 Hyundai Creta SX\(O\)/i)).toBeVisible();
    await expect(page.getByText(/Pending/i)).toBeVisible();
  });

  test("allows the user to cancel the booking", async ({ page }) => {
    page.on("dialog", async (dialog) => dialog.accept());
    await login(page, regularUser.email, regularUser.updatedPassword);
    await gotoPath(page, "/my-bookings");
    await page.getByRole("button", { name: "Cancel Booking" }).click();
    await expect(page.getByText(/Cancelled/i)).toBeVisible();
  });
});

test.describe.serial("admin flows", () => {
  test("shows the admin login guard when unauthenticated", async ({ page }) => {
    await gotoPath(page, "/admin");
    await expect(page.getByText(/Login Required/i)).toBeVisible();
  });

  test("logs in as the seeded admin user", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await expect(page.getByRole("heading", { name: /Inventory Dashboard/i })).toBeVisible();
  });

  test("inventory search filters the rows", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await page.getByPlaceholder(/Search by title, brand, code, city/i).fill("Creta");
    await expect(page.locator(".adm-table-row")).toHaveCount(1);
    await expect(page.locator(".adm-table-row")).toContainText("Hyundai");
  });

  test("inventory status filter keeps active listings visible", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await page.getByRole("button", { name: /Active \(/i }).click();
    await expect(page.locator(".adm-status-badge").first()).toContainText("Active");
  });

  test("admin settings page loads and saves a change", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin/settings");
    await expect(page.getByRole("heading", { name: /Site Settings/i })).toBeVisible();
    await page.getByRole("button", { name: "Site Name" }).click();
    await page.locator(".adm-settings-panel .adm-input").fill("SearchAnyCars QA");
    await page.getByRole("button", { name: /Save Site Name/i }).click();
    await expect(page.getByText(/saved!/i)).toBeVisible();
  });

  test("admin bookings tab shows the user booking", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await page.getByRole("button", { name: "Bookings" }).click();
    await expect(page.getByText(/2022 Hyundai Creta SX\(O\)/i)).toBeVisible();
  });

  test("admin can update a booking status", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await page.getByRole("button", { name: "Bookings" }).click();
    await page.locator("select").first().selectOption("confirmed");
    await page.getByRole("button", { name: /Save/i }).first().click();
    await expect(page.getByText(/Saved/i)).toBeVisible();
  });

  test("admin can create a listing from the UI", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin/car/new");
    await page.locator(".adm-form-main select").first().selectOption(listingDraft.brand);
    await page.getByPlaceholder("e.g., Creta, City").fill(listingDraft.model);
    await page.getByPlaceholder("e.g., 2022 Hyundai Creta SX(O)").fill(listingDraft.title);
    await page.getByPlaceholder("SAC-XXXXX").fill(listingDraft.code);
    await page.getByRole("button", { name: /Publish Listing/i }).click();
    await expect(page.getByText(/Listing created successfully!/i)).toBeVisible();
  });

  test("admin can locate the created listing in inventory", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await page.getByPlaceholder(/Search by title, brand, code, city/i).fill(listingDraft.code);
    await expect(page.locator(".adm-table-row")).toHaveCount(1);
    await expect(page.locator(".adm-table-row")).toContainText(listingDraft.title);
  });

  test("admin can edit the created listing", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await page.getByPlaceholder(/Search by title, brand, code, city/i).fill(listingDraft.code);
    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByPlaceholder("e.g., 2022 Hyundai Creta SX(O)").fill(listingDraft.updatedTitle);
    await page.getByRole("button", { name: /Update Listing/i }).click();
    await expect(page.getByText(/Listing updated successfully!/i)).toBeVisible();
  });

  test("admin can delete the created listing", async ({ page }) => {
    await loginAsAdmin(page);
    await gotoPath(page, "/admin");
    await page.getByPlaceholder(/Search by title, brand, code, city/i).fill(listingDraft.code);
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText(/Listing deleted successfully/i)).toBeVisible();
  });
});
