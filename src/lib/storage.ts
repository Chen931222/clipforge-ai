import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * 本機檔案儲存（STORAGE_PROVIDER=local）。
 * 檔案存在專案根目錄的 var/ 底下，由 /api/files/[...path] 服務。
 * 檔名一律重新命名為 UUID，不信任原始檔名（規格 §14）。
 */

export const VAR_ROOT = path.join(process.cwd(), "var");

export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "image/svg+xml": "svg",
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

export function assetTypeForMime(mime: string): "image" | "pdf" | "logo" {
  return mime === "application/pdf" ? "pdf" : "image";
}

function safeJoin(...segments: string[]): string {
  const joined = path.join(VAR_ROOT, ...segments);
  const normalized = path.normalize(joined);
  if (!normalized.startsWith(path.normalize(VAR_ROOT))) {
    throw new Error("path escapes storage root");
  }
  return normalized;
}

export async function saveUpload(
  projectId: string,
  bytes: Buffer,
  mimeType: string,
): Promise<{ fileName: string; storageUrl: string }> {
  const ext = ALLOWED_UPLOAD_TYPES[mimeType];
  if (!ext) throw new Error(`unsupported mime: ${mimeType}`);
  const fileName = `${randomUUID()}.${ext}`;
  const dir = safeJoin("uploads", projectId);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), bytes);
  return { fileName, storageUrl: `/api/files/uploads/${projectId}/${fileName}` };
}

export async function saveRenderOutput(jobId: string, bytes: Buffer): Promise<string> {
  const dir = safeJoin("renders");
  await mkdir(dir, { recursive: true });
  const fileName = `${jobId}.mp4`;
  await writeFile(path.join(dir, fileName), bytes);
  return `/api/files/renders/${fileName}`;
}

export function renderOutputPath(jobId: string): string {
  return safeJoin("renders", `${jobId}.mp4`);
}

export async function readStoredFile(relPath: string[]): Promise<Buffer> {
  return readFile(safeJoin(...relPath));
}

export function storedFilePath(relPath: string[]): string {
  return safeJoin(...relPath);
}

export async function deleteProjectFiles(projectId: string): Promise<void> {
  await rm(safeJoin("uploads", projectId), { recursive: true, force: true });
}

export async function deleteStoredFile(relPath: string[]): Promise<void> {
  await rm(safeJoin(...relPath), { force: true });
}

export function contentTypeForFile(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".mp4": "video/mp4",
    ".wav": "audio/wav",
    ".srt": "text/plain; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
}
