import { z } from "zod";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { exportKindSchema, recordExportEvent } from "@/lib/events";

const bodySchema = z.object({
  kind: exportKindSchema,
  projectId: z.string().max(50).optional(),
});

/** 前端動作型事件（目前只有文案複製 copy）。匿名，不與使用者關聯。 */
export const POST = withErrorHandling(async (req) => {
  await requireUser(); // 只擋未登入濫打，事件本身不記使用者
  const body = bodySchema.parse(await req.json());
  recordExportEvent(body.kind, body.projectId);
  return jsonOk({ ok: true });
});
