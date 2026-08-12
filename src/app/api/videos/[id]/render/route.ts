import { db } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedVideo, parseScenes } from "@/lib/models";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 建立渲染工作（規格 §4.6）。渲染由獨立 worker（pnpm worker）處理，
 * 不阻塞 API request；同一支影片同時只允許一個進行中的 job。
 */
export const POST = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const video = await getOwnedVideo(user.id, id);
  if (parseScenes(video.scenesJson).length === 0) {
    return jsonError("validation_error", 422, "這支影片還沒有場景，請先生成或編輯腳本");
  }

  const active = await db.renderJob.findFirst({
    where: { videoId: id, status: { in: ["queued", "processing"] } },
  });
  if (active) {
    return jsonError("conflict", 409, "這支影片已有進行中的渲染工作");
  }

  const job = await db.renderJob.create({
    data: { videoId: id, status: "queued", progress: 0 },
  });
  await db.video.update({ where: { id }, data: { status: "rendering" } });
  return jsonOk(job, { status: 201 });
});
