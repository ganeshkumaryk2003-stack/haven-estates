import { mkdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { DEMO, login } from "./helpers";

// Requires a seeded database: npm run db:seed
test.describe("seller journey", () => {
  test("creates a listing with a photo and submits it for review", async ({ page }, testInfo) => {
    await login(page, DEMO.seller.email);

    // Generate a small JPEG to upload.
    mkdirSync(testInfo.outputDir, { recursive: true });
    const photoPath = path.join(testInfo.outputDir, "photo.jpg");
    await sharp({ create: { width: 640, height: 480, channels: 3, background: { r: 15, g: 118, b: 110 } } }).jpeg().toFile(photoPath);

    const title = `Playwright test home ${Date.now()}`;
    await page.goto("/properties/new");
    await expect(page.getByRole("heading", { name: "List a property" })).toBeVisible();

    // Step 1 - basics
    await page.getByLabel("Listing title").fill(title);
    await page.getByLabel(/Asking price/).fill("12500000");
    await page.getByLabel("Reservation deposit").fill("50000");
    await page.getByLabel("Description").fill("A bright 3 BHK independent house created by the automated end-to-end test suite, with a garden and covered car parking.");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 2 - location
    await page.getByLabel("Address").fill("No. 42, Automation Layout, Whitefield");
    await page.getByLabel("City").fill("Bengaluru");
    await page.getByLabel("State").fill("Karnataka");
    await page.getByLabel("PIN code").fill("560066");
    await page.getByLabel("Country").fill("India");
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 3 - details (defaults are fine)
    await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 4 - amenities
    await expect(page.getByRole("heading", { name: "Amenities" })).toBeVisible();
    await page.getByLabel("Garden").check();
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 5 - photos
    await expect(page.getByRole("heading", { name: "Photos & media" })).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(photoPath);
    await expect(page.getByRole("list", { name: /Uploaded photos/ }).getByRole("listitem")).toHaveCount(1, { timeout: 20_000 });
    await page.getByRole("button", { name: "Next", exact: true }).click();

    // Step 6 - review & submit
    await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
    await page.getByRole("button", { name: "Submit for review" }).click();

    await expect(page).toHaveURL(/\/properties\//, { timeout: 20_000 });
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByText(/pending review/i).first()).toBeVisible();

    // The listing appears in the owner's dashboard.
    await page.goto("/dashboard/properties?status=PENDING_REVIEW");
    await expect(page.getByRole("link", { name: title })).toBeVisible();
  });
});
