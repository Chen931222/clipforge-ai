import { db } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { getOwnedProject } from "@/lib/models";
import {
  ALLOWED_UPLOAD_TYPES,
  MAX_UPLOAD_BYTES,
  assetTypeForMime,
  saveUpload,
} from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

/** 上傳素材（multipart/form-data，欄位 file；可選 kind=logo）。 */
export const POST = withErrorHandling<Ctx>(async (req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  await getOwnedProject(user.id, id);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("validation_error", 422, "缺少檔案欄位 file");
  }
  if (!ALLOWED_UPLOAD_TYPES[file.type]) {
    return jsonError(
      "unsupported_media_type",
      415,
      "只支援 PNG、JPG、WebP、SVG 圖片或 PDF",
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return jsonError("payload_too_large", 413, "檔案不可超過 10MB");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const { fileName, storageUrl } = await saveUpload(id, bytes, file.type);
  const kind = form.get("kind") === "logo" ? "logo" : assetTypeForMime(file.type);
  const asset = await db.asset.create({
    data: {
      projectId: id,
      type: kind,
      fileName,
      originalName: file.name.slice(0, 200),
      mimeType: file.type,
      storageUrl,
      metadataJson: JSON.stringify({ size: file.size }),
    },
  });
  return jsonOk(asset, { status: 201 });
});
