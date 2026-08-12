import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://localhost:3411",
    locale: "zh-TW",
  },
  webServer: {
    command: "pnpm e2e:serve",
    port: 3411,
    reuseExistingServer: false,
    timeout: 60_000,
    // Windows：pipe 會讓測試結束後卡住不退出（前案經驗）
    stdout: "ignore",
    stderr: "ignore",
  },
});
