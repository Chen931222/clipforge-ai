import { db } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { notFound } from "@/lib/errors";
import { deleteStoredFile } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export const DELETE = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const asset = await db.asset.findFirst({
    where: { id, project: { userId: user.id } },
  });
  if (!asset) throw notFound("找不到素材");
  await db.asset.delete({ where: { id } });
  if (asset.storageUrl.startsWith("/api/files/")) {
    await deleteStoredFile(asset.storageUrl.replace("/api/files/", "").split("/"));
  }
  return jsonOk({ ok: true });
});
