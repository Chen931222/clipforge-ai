import { db } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedVideo } from "@/lib/models";
import { videoPatchSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return jsonOk(await getOwnedVideo(user.id, id));
});

export const PATCH = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedVideo(user.id, id);
  const body = videoPatchSchema.parse(await req.json());
  const video = await db.video.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.subtitleStyle !== undefined ? { subtitleStyle: body.subtitleStyle } : {}),
      ...(body.scenes !== undefined
        ? {
            scenesJson: JSON.stringify(body.scenes),
            duration: body.scenes.reduce((s, sc) => s + sc.durationSec, 0),
            status: "edited",
          }
        : {}),
    },
  });
  return jsonOk(video);
});
