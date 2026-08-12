import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedRenderJob } from "@/lib/models";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const job = await getOwnedRenderJob(user.id, id);
  return jsonOk({
    id: job.id,
    videoId: job.videoId,
    status: job.status,
    progress: job.progress,
    outputUrl: job.outputUrl,
    errorMessage: job.errorMessage,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
  });
});
