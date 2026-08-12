import { db } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedProject } from "@/lib/models";
import { deleteProjectFiles } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  return jsonOk(await getOwnedProject(user.id, id));
});

/** 刪除專案及其素材檔案（規格 §14） */
export const DELETE = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(user.id, id);
  await db.project.delete({ where: { id } });
  await deleteProjectFiles(id);
  return jsonOk({ ok: true });
});
