import { expect, test } from "@playwright/test";

/**
 * 主要使用流程 E2E（規格 §16）：
 * Landing → Demo → 專案頁 → 編輯場景並儲存（重整後仍在）→ 策略頁 → 匯出端點。
 */

test("landing 顯示主張與 CTA", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /一份素材，完成主影片/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "免費製作 Demo" }).first()).toBeVisible();
});

test("demo 全流程：專案 → 編輯器儲存 → 策略 → 匯出", async ({ page }) => {
  // 免登入 Demo 入口
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/projects\//);
  await expect(page.getByRole("heading", { name: /冷泡烏龍茶禮盒/ })).toBeVisible();
  const projectId = page.url().split("/projects/")[1].split("/")[0];

  // 編輯器：cue sheet 有 8 個場景
  await page.goto(`/projects/${projectId}/editor`);
  await expect(page.getByText("CUE SHEET")).toBeVisible();
  await expect(page.getByText("S08", { exact: true })).toBeVisible();

  // 改第一個場景的標題並儲存
  await page.getByText("S01", { exact: true }).click();
  const titleInput = page.getByLabel("畫面標題");
  await titleInput.fill("E2E 測試標題");
  await page.getByRole("button", { name: "儲存變更" }).click();
  await expect(page.getByText("已儲存").first()).toBeVisible();

  // 重新整理後資料仍在（規格 §16：重整後專案資料仍存在）
  await page.reload();
  await page.getByText("S01", { exact: true }).click();
  await expect(page.getByLabel("畫面標題")).toHaveValue("E2E 測試標題");

  // 策略頁
  await page.goto(`/projects/${projectId}/strategy`);
  await expect(page.getByText("一句話策略")).toBeVisible();
  await expect(page.getByText("INSTAGRAM")).toBeVisible();

  // 渲染與匯出頁
  await page.goto(`/projects/${projectId}/renders`);
  await expect(page.getByRole("button", { name: /渲染 MP4/ }).first()).toBeVisible();

  // 匯出端點（帶著登入 cookie）
  const script = await page.request.get(`/api/projects/${projectId}/export/script`);
  expect(script.status()).toBe(200);
  expect(await script.text()).toContain("影片腳本");
  const json = await page.request.get(`/api/projects/${projectId}/export/json`);
  expect(json.status()).toBe(200);
});

test("註冊新帳號進入空作業檯，未登入 API 被拒", async ({ page }) => {
  // 未登入呼叫 API → 401
  const res = await page.request.get("/api/brands");
  expect(res.status()).toBe(401);

  await page.goto("/register");
  await page.getByLabel("名稱").fill("E2E 使用者");
  await page.getByLabel("Email").fill(`e2e-${Date.now()}@test.local`);
  await page.getByLabel("密碼").fill("Password123");
  await page.getByRole("button", { name: "建立帳號" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("還沒有任何專案")).toBeVisible();
});
