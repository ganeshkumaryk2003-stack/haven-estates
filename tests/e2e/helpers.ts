import { expect, type Page } from "@playwright/test";

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

export const DEMO = {
  buyer: { email: "priya.nair@haven.local", name: "Priya Nair" },
  seller: { email: "maria.santos@haven.local", name: "Maria Santos" },
  admin: { email: "admin@haven.local", name: "Avery Admin" },
};

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
