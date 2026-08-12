import { db } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getContentAIProvider } from "@/lib/ai";
import {
  brandToInput,
  getOwnedVideo,
  parseScenes,
  projectToInput,
} from "@/lib/models";
import { regenerateSceneSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 重新生成單一場景的文字。只改該場景，其他場景原封不動（規格 §4.4）。
 */
export const POST = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const body = regenerateSceneSchema.parse(await req.json());
  const video = await getOwnedVideo(user.id, id);
  const scenes = parseScenes(video.scenesJson);
  const index = scenes.findIndex((s) => s.id === body.sceneId);
  if (index === -1) return jsonError("not_found", 404, "找不到這個場景");

  const provider = getContentAIProvider();
  const newScene = await provider.regenerateScene({
    brand: brandToInput(video.project.brand),
    project: projectToInput(video.project),
    scene: scenes[index],
    sceneIndex: index,
    sceneCount: scenes.length,
    videoTitle: video.title,
    instruction: body.instruction,
  });

  // 只覆蓋文字類欄位；id、秒數與素材設定保留原值
  const merged = {
    ...scenes[index],
    narration: newScene.narration,
    title: newScene.title,
    subtitle: newScene.subtitle,
  };
  const nextScenes = [...scenes];
  nextScenes[index] = merged;
  await db.video.update({
    where: { id },
    data: { scenesJson: JSON.stringify(nextScenes) },
  });
  return jsonOk({ scene: merged });
});
