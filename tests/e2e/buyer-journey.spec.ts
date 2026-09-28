import { expect, test } from "@playwright/test";
import { DEMO, login } from "./helpers";

// Requires a seeded database: npm run db:seed
test.describe("buyer journey", () => {
  test("signs in, browses, filters, opens a listing and sends an enquiry", async ({ page }) => {
    await login(page, DEMO.buyer.email);
    await expect(page.getByRole("heading", { name: /welcome back, priya/i })).toBeVisible();

    // Browse with URL-based filters.
    await page.goto("/properties?listingType=SALE&propertyType=HOUSE&sort=price_desc");
    await expect(page.getByRole("heading", { name: /homes for sale/i })).toBeVisible();
    const results = page.getByRole("region", { name: "Search results" });
    await expect(results.getByRole("status")).toContainText(/propert(y|ies) found/);
    const chips = page.getByRole("list", { name: "Active filters" });
    await expect(chips.getByText("For sale")).toBeVisible();
    await expect(chips.getByText("House")).toBeVisible();

    // Open a listing that is not owned by the buyer (first result).
    const firstCard = results.getByRole("article").first();
    const title = (await firstCard.getByRole("heading").innerText()).trim();
    await firstCard.getByRole("link", { name: title }).click();
    await expect(page).toHaveURL(/\/properties\//);
    await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Key facts" })).toBeVisible();

    // Enquire.
    await page.getByRole("button", { name: "Enquire" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Enquire about this property" })).toBeVisible();
    await dialog.getByLabel("Subject").fill(`Playwright enquiry ${Date.now()}`);
    await dialog.getByLabel("Message").fill("Hello! This enquiry was sent by the automated end-to-end test. Is the property still available?");
    await dialog.getByRole("button", { name: "Send enquiry" }).click();
    await expect(page.getByText("Enquiry sent. The seller will get back to you.")).toBeVisible();

    // It shows up under sent enquiries.
    await page.goto("/dashboard/enquiries?tab=sent");
    await expect(page.getByText(/Playwright enquiry/).first()).toBeVisible();
  });

  test("redirects guests to login when they try to save a property", async ({ page }) => {
    await page.goto("/properties");
    await page.getByRole("button", { name: "Save to favorites" }).first().click();
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });
});
