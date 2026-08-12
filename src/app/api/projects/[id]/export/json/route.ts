import { withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import {
  getOwnedProject,
  parseScenes,
  parseSellingPoints,
  parseSocialCopy,
  parseStrategy,
} from "@/lib/models";
import { recordExportEvent } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

/** 專案完整 JSON 匯出（規格 §4.7） */
export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const project = await getOwnedProject(user.id, id);
  const payload = {
    project: {
      id: project.id,
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
      status: project.status,
    },
    brand: {
      name: project.brand.name,
      industry: project.brand.industry,
      tone: project.brand.tone,
      primaryColor: project.brand.primaryColor,
      secondaryColor: project.brand.secondaryColor,
      textColor: project.brand.textColor,
      logoUrl: project.brand.logoUrl,
    },
    strategy: parseStrategy(project.strategyJson),
    assets: project.assets.map((a) => ({
      id: a.id,
      type: a.type,
      originalName: a.originalName,
      storageUrl: a.storageUrl,
    })),
    videos: project.videos.map((v) => ({
      id: v.id,
      type: v.type,
      title: v.title,
      aspectRatio: v.aspectRatio,
      duration: v.duration,
      subtitleStyle: v.subtitleStyle,
      scenes: parseScenes(v.scenesJson),
      socialCopy: parseSocialCopy(v.socialCopyJson),
      status: v.status,
    })),
    exportedAt: new Date().toISOString(),
  };
  recordExportEvent("json", id);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="clipforge-${id}.json"`,
    },
  });
});
