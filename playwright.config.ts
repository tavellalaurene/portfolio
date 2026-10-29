import { defineConfig, devices } from "@playwright/test";

// Runs against the built site (npm run build first), served by `astro preview`.
export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:4321/portfolio/",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npx astro preview --port 4321 --ignore-lock",
    url: "http://localhost:4321/portfolio/",
    reuseExistingServer: !process.env.CI,
  },
});
