import type { Brand, Project, Video } from "@prisma/client";
import { db } from "./db";
import { notFound } from "./errors";
import {
  contentStrategySchema,
  scenesSchema,
  socialCopySchema,
  type ContentStrategy,
  type Scene,
  type SocialCopy,
} from "./ai/schemas";
import type { BrandInput, ProjectInput } from "./ai/types";

/** JSON 欄位解析：壞資料不炸頁面，回安全預設值。 */

export function parseScenes(json: string): Scene[] {
  try {
    const parsed = scenesSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function parseSocialCopy(json: string): SocialCopy | null {
  try {
    const parsed = socialCopySchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parseStrategy(json: string | null): ContentStrategy | null {
  if (!json) return null;
  try {
    const parsed = contentStrategySchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function parseSellingPoints(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** 資源所有權驗證（規格 §11/§14）：查無或不屬於該使用者一律 404，不洩漏存在性。 */

export async function getOwnedBrand(userId: string, brandId: string) {
  const brand = await db.brand.findFirst({ where: { id: brandId, userId } });
  if (!brand) throw notFound("找不到品牌");
  return brand;
}

export async function getOwnedProject(userId: string, projectId: string) {
  const project = await db.project.findFirst({
    where: { id: projectId, userId },
    include: { brand: true, assets: true, videos: { orderBy: { createdAt: "asc" } } },
  });
  if (!project) throw notFound("找不到專案");
  return project;
}

export async function getOwnedVideo(userId: string, videoId: string) {
  const video = await db.video.findFirst({
    where: { id: videoId, project: { userId } },
    include: { project: { include: { brand: true, assets: true } } },
  });
  if (!video) throw notFound("找不到影片");
  return video;
}

export async function getOwnedRenderJob(userId: string, jobId: string) {
  const job = await db.renderJob.findFirst({
    where: { id: jobId, video: { project: { userId } } },
    include: { video: true },
  });
  if (!job) throw notFound("找不到渲染工作");
  return job;
}

/** 轉成 AI provider 的輸入格式 */

export function brandToInput(brand: Brand): BrandInput {
  return {
    name: brand.name,
    industry: brand.industry,
    description: brand.description,
    audience: brand.audience,
    tone: brand.tone,
    defaultCta: brand.defaultCta,
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor,
    textColor: brand.textColor,
  };
}

export function projectToInput(project: Project): ProjectInput {
  return {
    name: project.name,
    productName: project.productName,
    productDescription: project.productDescription,
    objective: project.objective,
    audience: project.audience,
    sellingPoints: parseSellingPoints(project.sellingPointsJson),
    cta: project.cta,
    language: project.language,
    style: project.style,
    masterDuration: project.masterDuration,
    shortVideoCount: project.shortVideoCount,
  };
}

/**
 * 把 AI 企劃套進專案：寫 strategy_json、重建 videos。
 * 只在「生成／重新生成」時呼叫；使用者編輯過的影片由前端確認後才會走到這裡。
 */
export async function applyStrategy(projectId: string, strategy: ContentStrategy) {
  const masterDuration = strategy.master.scenes.reduce((s, sc) => s + sc.durationSec, 0);
  await db.$transaction(async (tx) => {
    await tx.project.update({
      where: { id: projectId },
      data: { strategyJson: JSON.stringify(strategy), status: "scripted" },
    });
    await tx.video.deleteMany({ where: { projectId } });
    await tx.video.create({
      data: {
        projectId,
        type: "master",
        title: strategy.master.title,
        aspectRatio: "16:9",
        duration: masterDuration,
        scenesJson: JSON.stringify(strategy.master.scenes),
        socialCopyJson: JSON.stringify(strategy.socialCopy),
        status: "scripted",
      },
    });
    for (const short of strategy.shorts) {
      await tx.video.create({
        data: {
          projectId,
          type: "short",
          title: short.title,
          aspectRatio: "9:16",
          duration: short.scenes.reduce((s, sc) => s + sc.durationSec, 0),
          scenesJson: JSON.stringify(short.scenes),
          socialCopyJson: JSON.stringify({
            hook: short.hook,
            body: short.body,
            cta: short.cta,
          }),
          status: "scripted",
        },
      });
    }
  });
}

export type VideoWithScenes = Video & { scenes: Scene[] };
