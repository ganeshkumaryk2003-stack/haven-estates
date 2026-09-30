import { expect, type Page } from "@playwright/test";

export const SEED_PASSWORD = process.env.SEED_PASSWORD ?? "Password123!";

export const DEMO = {
  buyer: { email: "priya.menon@doorkey.local", name: "Priya Menon" },
  seller: { email: "meera.iyer@doorkey.local", name: "Meera Iyer" },
  admin: { email: "admin@doorkey.local", name: "Aarav Admin" },
};

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel(/^Password/).fill(SEED_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}
