import { z } from "zod";
import { db } from "./db";

/**
 * 匿名匯出行為事件（付費訊號分析）：
 * 只記「哪種輸出、哪個專案、何時」，不記使用者身分。
 * 寫入失敗不影響主流程（fire-and-forget）。
 */

export const exportKindSchema = z.enum(["mp4", "srt", "script", "json", "copy"]);
export type ExportKind = z.infer<typeof exportKindSchema>;

export function recordExportEvent(kind: ExportKind, projectId?: string | null) {
  db.exportEvent
    .create({ data: { kind, projectId: projectId ?? null } })
    .catch((err) => console.warn("[events] record failed:", err?.code ?? err));
}

export async function exportStats() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, recent] = await Promise.all([
    db.exportEvent.groupBy({ by: ["kind"], _count: { _all: true } }),
    db.exportEvent.groupBy({
      by: ["kind"],
      where: { createdAt: { gte: since7d } },
      _count: { _all: true },
    }),
  ]);
  const kinds: ExportKind[] = ["mp4", "copy", "srt", "script", "json"];
  return kinds.map((kind) => ({
    kind,
    total: total.find((t) => t.kind === kind)?._count._all ?? 0,
    last7d: recent.find((t) => t.kind === kind)?._count._all ?? 0,
  }));
}
