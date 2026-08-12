import { z } from "zod";

/** 十六進位色碼（#RGB 或 #RRGGBB） */
export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "必須是 #RRGGBB 色碼");

export const assetModeSchema = z.enum(["cover", "center", "split", "blur-bg"]);
export const animationSchema = z.enum([
  "fade",
  "rise",
  "zoom",
  "slide-left",
  "slide-right",
]);
export const transitionSchema = z.enum(["cut", "fade", "slide", "wipe"]);
export const subtitleStyleSchema = z.enum(["classic", "bold-short", "minimal-luxe"]);

export const sceneSchema = z.object({
  id: z.string().min(1),
  durationSec: z.number().min(1).max(40),
  narration: z.string().max(400),
  title: z.string().max(60),
  subtitle: z.string().max(80).optional().default(""),
  assetId: z.string().nullable().optional().default(null),
  assetMode: assetModeSchema.default("cover"),
  animation: animationSchema.default("fade"),
  transition: transitionSchema.default("fade"),
  backgroundColor: hexColorSchema.optional(),
  needsConfirmation: z.boolean().optional().default(false),
});

export type Scene = z.infer<typeof sceneSchema>;

export const scenesSchema = z.array(sceneSchema).min(1).max(24);

export const shortScriptSchema = z.object({
  title: z.string().min(1).max(60),
  hook: z.string().min(1).max(120),
  body: z.string().min(1).max(300),
  cta: z.string().min(1).max(80),
  durationSec: z.number().min(10).max(35),
  scenes: scenesSchema,
});

export type ShortScript = z.infer<typeof shortScriptSchema>;

export const socialCopySchema = z.object({
  youtubeTitle: z.string().min(1).max(100),
  youtubeDescription: z.string().min(1).max(2000),
  instagram: z.string().min(1).max(2000),
  facebook: z.string().min(1).max(2000),
  tiktok: z.string().min(1).max(1000),
  hashtags: z.array(z.string().min(1)).min(3).max(20),
  thumbnailTitles: z.array(z.string().min(1).max(30)).length(3),
});

export type SocialCopy = z.infer<typeof socialCopySchema>;

export const contentStrategySchema = z.object({
  strategyOneLiner: z.string().min(1).max(120),
  painPoints: z.array(z.string().min(1)).min(1).max(6),
  coreMessages: z.array(z.string().min(1)).min(1).max(6),
  master: z.object({
    title: z.string().min(1).max(80),
    scenes: scenesSchema,
  }),
  shorts: z.array(shortScriptSchema).min(1).max(5),
  socialCopy: socialCopySchema,
  complianceNote: z.string().nullable().optional().default(null),
  needsConfirmation: z.array(z.string()).default([]),
});

export type ContentStrategy = z.infer<typeof contentStrategySchema>;

/** 專案表單的共用枚舉 */
export const objectiveSchema = z.enum([
  "expo", // 展會介紹
  "promotion", // 產品推廣
  "branding", // 品牌形象
  "conversion", // 導購
  "education", // 教育內容
]);
export const styleSchema = z.enum([
  "professional",
  "tech",
  "warm",
  "playful",
  "premium",
  "minimal",
]);
export const languageSchema = z.enum(["zh-TW", "en"]);

export const OBJECTIVE_LABELS: Record<z.infer<typeof objectiveSchema>, string> = {
  expo: "展會介紹",
  promotion: "產品推廣",
  branding: "品牌形象",
  conversion: "導購",
  education: "教育內容",
};

export const STYLE_LABELS: Record<z.infer<typeof styleSchema>, string> = {
  professional: "專業",
  tech: "科技",
  warm: "溫暖",
  playful: "活潑",
  premium: "高級",
  minimal: "極簡",
};
