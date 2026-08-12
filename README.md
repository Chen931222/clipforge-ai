# ClipForge AI

一份素材，完成主影片、短影音與整月社群內容。上傳品牌資料與產品素材，AI 完成企劃、腳本、配音、字幕、MP4 渲染與社群文案。

- **不需要任何 API 金鑰即可跑完整流程**（Mock AI／Mock TTS）
- 渲染使用 [Remotion](https://remotion.dev)，輸出真正可播放的 MP4（16:9 主影片＋9:16 短影音）
- 編輯器預覽（Remotion Player）與最終渲染使用同一份合成元件，所見即所渲

## 技術棧

Next.js 15（App Router）・TypeScript strict・Tailwind CSS v4・Prisma 6 + SQLite・Remotion 4・Zod・Vitest・Playwright

> 與規格書的偏離（皆為刻意選擇，README 末尾詳述）：PostgreSQL/Supabase → **SQLite + 本機檔案儲存**（本機無 Docker；規格 §6 允許 demo mode）；shadcn/ui → 手寫元件。Supabase／PostgreSQL 的接點都留在抽象層（`DATABASE_URL`、`STORAGE_PROVIDER`）。

## 快速開始

需求：Node.js ≥ 20.11、pnpm ≥ 9。

```bash
pnpm install
pnpm setup        # prisma generate + migrate + seed（建立森日茶研 demo）
pnpm dev          # http://localhost:3410
```

另開一個終端機啟動渲染 worker（要輸出 MP4 才需要）：

```bash
pnpm worker
```

worker 首次啟動會下載 Chrome Headless Shell（約 113MB，只下載一次）。

### Demo 操作路徑（10 分鐘）

1. 開 `http://localhost:3410` → 按「**免費製作 Demo**」（免登入，自動進入森日茶研範例專案）。
2. 專案頁：看素材、AI 輸入摘要；可按「重新生成企劃與腳本」（會先確認覆蓋）。
3. 「內容策略」：一句話策略、痛點、社群文案（一鍵複製）、縮圖標題。
4. 「場景編輯器」：左欄 cue sheet 選場景、右欄改秒數／旁白／素材／動畫，16:9↔9:16 切換預覽，「重新生成此場景文字」只動該場景。記得按「儲存變更」。
5. 「渲染與匯出」：按「渲染 MP4」→ 進度條跑完 → 下載 MP4／SRT／Markdown 腳本／專案 JSON。

Demo 帳號：`demo@clipforge.local` / `Demo1234!`（`/demo` 會自動登入）。

## 環境變數

複製 `.env.example` 為 `.env`。預設值即可跑完整 demo：

| 變數 | 預設 | 說明 |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | SQLite；換 PostgreSQL 時改連線字串與 schema provider |
| `AI_PROVIDER` | `mock` | `mock`／`anthropic`；設 anthropic 需同時給 `ANTHROPIC_API_KEY`，缺金鑰自動退回 mock |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | 只在 anthropic 模式使用 |
| `TTS_PROVIDER` | `mock` | `mock`＝節奏對位合成音軌；`edge`＝Microsoft Edge 朗讀端點，**真中文語音、免金鑰**（非官方端點，僅限開發／展示；失敗自動退回 mock；正式上線請實作付費供應商到同一 `TTSProvider` 介面） |
| `EDGE_TTS_VOICE` | 空 | edge 聲線覆寫；預設 `zh-TW-HsiaoChenNeural`（台灣女聲），英文專案用 `en-US-AriaNeural` |
| `STORAGE_PROVIDER` | `local` | 上傳存 `var/uploads/`，渲染輸出存 `var/renders/`，由 `/api/files` 驗證所有權後服務 |

## 指令

| 指令 | 說明 |
|---|---|
| `pnpm dev` | 開發伺服器（port 3410） |
| `pnpm worker` | 渲染 worker（輪詢 render_jobs，Remotion → MP4） |
| `pnpm setup` | generate + migrate + seed（可重複執行） |
| `pnpm db:reset` | 刪 DB 重建＋seed |
| `pnpm test` | Vitest 單元測試（31 個） |
| `pnpm test:e2e` | build＋獨立 e2e.db＋Playwright（**先停掉 dev server**，`next build` 與 `next dev` 共用 `.next`） |
| `pnpm lint` / `pnpm typecheck` | ESLint / tsc |
| `pnpm verify` | lint + typecheck + test + build |

## 架構速覽

```
資料流：品牌/專案表單 → POST /generate → ContentAIProvider（Zod 驗證）
       → strategy_json + videos.scenes_json → 編輯器 PATCH scenes
       → POST /render 建 job → worker 輪詢 → Remotion renderMedia → var/renders/*.mp4
       → /api/files（逐檔驗所有權）
```

- `src/lib/ai/`：`ContentAIProvider` 介面、`MockContentAIProvider`（模板生成）、`AnthropicContentAIProvider`（fetch＋JSON 修復重試一次、記錄 token 不記金鑰）、prompts 集中在 `prompts.ts`
- `src/lib/tts/`：TTS 抽象；mock 用純程式合成 WAV（旁白節奏軌＋和弦背景音樂）
- `remotion/`：`SceneComposition`（Ken Burns、四種素材模式、轉場、三種字幕樣式、品牌色）＋ `Master`(1920×1080)/`Short`(1080×1920) 兩個 composition；編輯器的 `@remotion/player` 直接掛同一元件
- `scripts/render-worker.ts`：獨立 process；素材與音軌轉 data URL 餵給 Remotion，進度寫回 DB
- 所有 API：登入＋資源所有權驗證、Zod 輸入驗證、一致錯誤格式 `{ error: { code, message } }`

## 匯出行為統計（付費訊號）

MP4 下載、SRT、Markdown 腳本、專案 JSON、文案複製都會記一筆**匿名事件**（只記種類＋專案，不記使用者），彙總顯示在「設定 → 匯出行為統計」。拿來觀察試用客戶實際帶走哪種輸出、決定定價方向。

## 陪跑展示

10 分鐘客戶實測腳本（含講稿、時間表、異常應對）：[docs/demo-playbook.md](docs/demo-playbook.md)。

## 安全（規格 §14 對應）

上傳限型別與 10MB、檔名一律改 UUID、`/api/files` 逐檔驗所有權、API Key 只在 server env、刪專案連檔案一起刪、素材版權勾選、真人授權提醒（設定頁）。

## 已知限制

- Mock TTS 是「節奏對位的合成音軌」，不是真人語音——接真 TTS 時實作 `TTSProvider` 介面即可。
- 影片內字型使用系統字型（Noto Serif TC → PMingLiU fallback），跨機器渲染字型可能略有差異。
- Demo 帳號是共用帳號；正式部署前應改為每訪客一份 sandbox 資料。
- PDF 素材可上傳保存，但場景目前只使用圖片素材。
