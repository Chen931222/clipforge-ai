import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/**
 * demo-en 刻意放在產品 repo 內，不另開 sibling 專案：
 * 它直接 import ../remotion 與 ../src 的原始碼，共用同一份 node_modules。
 * 若放在外面，remotion/react 會解析出兩份 module instance，
 * Player 會炸 "useCurrentFrame() can only be called inside a composition"。
 */
export default defineConfig({
  // 從 repo 根目錄以 --config 啟動時，root 會預設成 cwd 而不是設定檔所在資料夾
  root: here("."),
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      // 產品程式碼用 "@/..." 指向 src
      "@": here("../src"),
      // mock provider 只為了產生 id 而 import node:crypto，瀏覽器有原生的
      "node:crypto": here("./src/shims/node-crypto.ts"),
    },
    dedupe: ["react", "react-dom", "remotion"],
  },
  define: {
    // 產品程式碼讀 process.env；瀏覽器沒有 process
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production"),
    // 引擎自己的假延遲關掉；由頁面控制節奏（首次載入即時，訪客按下才留一拍）
    "process.env.MOCK_FAST": JSON.stringify("1"),
  },
  server: {
    port: 5199,
    // dev 時要讀 demo-en 之外的原始碼
    fs: { allow: [here("..")] },
  },
  // 資料夾名就是 Vercel 的專案名（從這個資料夾直接部署靜態檔，不讓 Vercel 建置——
  // 原始碼在 deploy root 之外，Vercel 建不起來）
  build: { outDir: "clipforge-demo", emptyOutDir: true },
});
