import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getContentAIProvider } from "@/lib/ai";
import {
  applyStrategy,
  brandToInput,
  getOwnedProject,
  projectToInput,
} from "@/lib/models";

type Ctx = { params: Promise<{ id: string }> };

/**
 * 產生（或重新產生）內容企劃與所有影片腳本。
 * 注意：會重建 videos——前端在已有腳本時需先跳確認提示（規格 §12）。
 */
export const POST = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const project = await getOwnedProject(user.id, id);

  const provider = getContentAIProvider();
  const strategy = await provider.generateStrategy({
    brand: brandToInput(project.brand),
    project: projectToInput(project),
    assets: project.assets.map((a) => ({
      id: a.id,
      type: a.type,
      originalName: a.originalName,
    })),
  });

  await applyStrategy(id, strategy);
  return jsonOk({ strategy });
});
