import type { RegenerateSceneInput, SocialCopyInput, StrategyInput } from "./types";

/**
 * Prompt 集中管理（規格 §9：不散落在 API route）。
 * 系統提示遵守規格 §10 的原則。
 */

export const SYSTEM_PROMPT = `你是資深影音內容策略師，為台灣品牌規劃影片與社群內容。嚴格遵守：
1. 不捏造產品功能、數據、客戶證言或認證；資料不足時使用中性表述，並在 needsConfirmation 陣列說明。
2. Hook 必須具體，禁止「你知道嗎」這類空泛開場。
3. 每個場景只傳達一個主要訊息；旁白長度須能在該場景秒數內自然說完（中文約每秒 4 字）。
4. 短影音不是長片截短，每支都要有自己的 Hook 與 CTA。
5. 繁體中文須符合台灣用語。
6. 內容涉及醫療、金融、法律時，在 complianceNote 提醒需人工審核。
你只輸出合法 JSON，不加任何說明文字或 markdown 圍欄。`;

export function strategyUserPrompt(input: StrategyInput, jsonSchemaHint: string): string {
  return `請為以下專案產生完整內容企劃，輸出符合此 TypeScript/JSON 結構的 JSON（不得多或少欄位）：
${jsonSchemaHint}

主影片結構：0-5 秒 Hook；接著問題情境（約 16%）；產品與最多三項主要價值（約 50%）;案例或使用場景（約 20%）;最後 5-10 秒 CTA。場景總秒數必須等於 masterDuration。
短影音每支 15-30 秒、3 個場景（Hook/正文/CTA）。

品牌：${JSON.stringify(input.brand, null, 2)}
專案：${JSON.stringify(input.project, null, 2)}
可用素材（以 assetId 引用）：${JSON.stringify(input.assets)}`;
}

export function regenerateSceneUserPrompt(input: RegenerateSceneInput): string {
  return `以下是影片「${input.videoTitle}」第 ${input.sceneIndex + 1}/${input.sceneCount} 場景。請重寫 narration、title、subtitle（其餘欄位原樣保留），輸出完整場景 JSON。旁白須在 ${input.scene.durationSec} 秒內講完。${input.instruction ? `額外指示：${input.instruction}` : ""}

品牌：${JSON.stringify(input.brand)}
專案重點：${JSON.stringify({ productName: input.project.productName, sellingPoints: input.project.sellingPoints, cta: input.project.cta, style: input.project.style })}
場景：${JSON.stringify(input.scene)}`;
}

export function socialCopyUserPrompt(input: SocialCopyInput): string {
  return `請為影片「${input.masterTitle}」產生社群文案 JSON（youtubeTitle, youtubeDescription, instagram, facebook, tiktok, hashtags[], thumbnailTitles[3]）。
品牌：${JSON.stringify(input.brand)}
專案：${JSON.stringify(input.project)}`;
}

export const STRATEGY_SHAPE_HINT = `{
  "strategyOneLiner": string,
  "painPoints": string[],
  "coreMessages": string[],
  "master": { "title": string, "scenes": Scene[] },
  "shorts": [{ "title": string, "hook": string, "body": string, "cta": string, "durationSec": number, "scenes": Scene[] }],
  "socialCopy": { "youtubeTitle": string, "youtubeDescription": string, "instagram": string, "facebook": string, "tiktok": string, "hashtags": string[], "thumbnailTitles": [string, string, string] },
  "complianceNote": string | null,
  "needsConfirmation": string[]
}
Scene = {
  "id": string, "durationSec": number, "narration": string, "title": string, "subtitle": string,
  "assetId": string | null, "assetMode": "cover"|"center"|"split"|"blur-bg",
  "animation": "fade"|"rise"|"zoom"|"slide-left"|"slide-right",
  "transition": "cut"|"fade"|"slide"|"wipe",
  "backgroundColor": "#RRGGBB", "needsConfirmation": boolean
}`;
