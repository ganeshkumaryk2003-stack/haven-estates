import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

mkdirSync(".tmp-shots/out", { recursive: true });
const base = "http://localhost:3000";
const browser = await chromium.launch();

async function shot(name, url, { width, dark, fullPage = false, login } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: dark ? "dark" : "light" });
  const page = await context.newPage();
  if (login) {
    await page.goto(`${base}/login`);
    await page.getByLabel("Email").fill(login);
    await page.getByLabel(/^Password/).fill("Password123!");
    await page.getByRole("button", { name: "Log in" }).click();
    await page.waitForURL(/dashboard/);
  }
  if (dark) {
    await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  }
  await page.goto(`${base}${url}`, { waitUntil: "networkidle" });
  if (dark) {
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  const file = `.tmp-shots/out/${name}-${width}${dark ? "-dark" : ""}.png`;
  await page.screenshot({ path: file, fullPage });
  console.log(`${file} overflow=${overflow}px`);
  await context.close();
}

const firstSlug = await (async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${base}/properties`, { waitUntil: "networkidle" });
  const href = await page.getByRole("region", { name: "Search results" }).getByRole("article").first().getByRole("heading").getByRole("link").getAttribute("href");
  await context.close();
  return href;
})();

for (const width of [375, 768, 1280]) {
  for (const dark of [false, true]) {
    await shot("home", "/", { width, dark, fullPage: true });
    await shot("browse", "/properties", { width, dark });
    await shot("detail", firstSlug, { width, dark, fullPage: true });
    await shot("login", "/login", { width, dark });
  }
}
await shot("map", "/properties?view=map", { width: 1280 });
await shot("dashboard", "/dashboard", { width: 1280, login: "karthik.raman@doorkey.local" });
await shot("dashboard", "/dashboard", { width: 375, login: "karthik.raman@doorkey.local", fullPage: true });
await shot("offers", "/dashboard/offers", { width: 1280, login: "vikram.singh@doorkey.local" });
await browser.close();
