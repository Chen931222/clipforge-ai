import { db } from "@/lib/db";
import { jsonError, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { contentTypeForFile, readStoredFile } from "@/lib/storage";
import { recordExportEvent } from "@/lib/events";

type Ctx = { params: Promise<{ path: string[] }> };

/**
 * 服務 var/ 底下的檔案（上傳素材與渲染輸出），逐檔驗證所有權（規格 §14）。
 */
export const GET = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { path: segments } = await params;
  if (!segments || segments.length < 2) throw notFound();

  const [kind, ...rest] = segments;
  if (kind === "uploads") {
    const [projectId, fileName] = rest;
    if (!projectId || !fileName) throw notFound();
    const owned = await db.asset.findFirst({
      where: { fileName, projectId, project: { userId: user.id } },
    });
    if (!owned) throw notFound();
  } else if (kind === "renders") {
    const jobId = rest[0]?.replace(/\.mp4$/, "");
    if (!jobId) throw notFound();
    const owned = await db.renderJob.findFirst({
      where: { id: jobId, video: { project: { userId: user.id } } },
      include: { video: { select: { projectId: true } } },
    });
    if (!owned) throw notFound();
    // 只在完整下載的首個請求計數（略過 <video> metadata probe 的後續 Range 請求）
    const range = req.headers.get("range");
    if (!range || range.startsWith("bytes=0-")) {
      recordExportEvent("mp4", owned.video.projectId);
    }
  } else {
    return jsonError("not_found", 404, "找不到資源");
  }

  let bytes: Buffer;
  try {
    bytes = await readStoredFile(segments);
  } catch {
    throw notFound("檔案不存在或已被刪除");
  }
  const fileName = segments[segments.length - 1];
  return new Response(new Uint8Array(bytes), {
    headers: {
      "content-type": contentTypeForFile(fileName),
      "cache-control": "private, max-age=3600",
    },
  });
});
