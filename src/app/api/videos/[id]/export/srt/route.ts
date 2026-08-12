import { withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedVideo, parseScenes } from "@/lib/models";
import { buildSubtitleCues, toSrt } from "@/lib/srt";
import { recordExportEvent } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const video = await getOwnedVideo(user.id, id);
  const srt = toSrt(buildSubtitleCues(parseScenes(video.scenesJson)));
  recordExportEvent("srt", video.projectId);
  return new Response(srt, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "content-disposition": `attachment; filename="${video.type}-${id}.srt"`,
    },
  });
});
