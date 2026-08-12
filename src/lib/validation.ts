import { z } from "zod";
import {
  hexColorSchema,
  languageSchema,
  objectiveSchema,
  scenesSchema,
  styleSchema,
  subtitleStyleSchema,
} from "./ai/schemas";

export const registerSchema = z.object({
  email: z.string().email("Email 格式不正確"),
  name: z.string().min(1, "請輸入名稱").max(60),
  password: z.string().min(8, "密碼至少 8 碼").max(100),
});

export const loginSchema = z.object({
  email: z.string().email("Email 格式不正確"),
  password: z.string().min(1, "請輸入密碼"),
});

export const brandInputSchema = z.object({
  name: z.string().min(1, "請輸入品牌名稱").max(60),
  industry: z.string().max(40).default(""),
  description: z.string().max(600).default(""),
  audience: z.string().max(200).default(""),
  tone: z.string().max(100).default(""),
  defaultCta: z.string().max(60).default(""),
  primaryColor: hexColorSchema.default("#1C1A15"),
  secondaryColor: hexColorSchema.default("#F7F5F0"),
  textColor: hexColorSchema.default("#FFFFFF"),
  logoUrl: z.string().max(500).nullable().optional(),
  websiteUrl: z.string().url("網址格式不正確").max(500).nullable().optional().or(z.literal("")),
});

export const projectCreateSchema = z.object({
  name: z.string().min(1, "請輸入專案名稱").max(80),
  brandId: z.string().min(1, "請選擇品牌"),
  productName: z.string().min(1, "請輸入產品／服務名稱").max(60),
  productDescription: z.string().max(2000).default(""),
  objective: objectiveSchema,
  audience: z.string().max(200).default(""),
  sellingPoints: z.array(z.string().max(60)).max(5, "賣點最多五項").default([]),
  cta: z.string().max(60).default(""),
  language: languageSchema.default("zh-TW"),
  style: styleSchema.default("warm"),
  masterDuration: z
    .number()
    .refine((v) => [60, 90, 120].includes(v), "主影片長度限 60／90／120 秒"),
  shortVideoCount: z.number().int().min(3).max(5),
});

export const videoPatchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  scenes: scenesSchema.optional(),
  subtitleStyle: subtitleStyleSchema.optional(),
});

export const regenerateSceneSchema = z.object({
  sceneId: z.string().min(1),
  instruction: z.string().max(300).optional(),
});
