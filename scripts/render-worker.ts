/**
 * 渲染 worker（規格 §4.6）：獨立 process 輪詢 render_jobs，
 * 用 Remotion 渲染 MP4 到 var/renders/，不阻塞 API。
 *
 * 啟動：pnpm worker
 */
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, selectComposition } from "@remotion/renderer";
import { parseScenes } from "../src/lib/models";
import { getTTSProvider } from "../src/lib/tts";
import { SAMPLE_RATE, samplesToWav, synthMusicTrack } from "../src/lib/tts/wav";
import type { Scene } from "../src/lib/ai/schemas";

const ROOT = path.resolve(path.join(import.meta.dirname, ".."));

// tsx 不會自動載入 .env——最小 loader，只補未設定的鍵
function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnv();

const db = new PrismaClient();
const POLL_MS = 2000;

function mimeFor(file: string): string {
  const ext = path.extname(file).toLowerCase();
  return (
    {
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
    }[ext] ?? "application/octet-stream"
  );
}

/** storageUrl → 本機檔案路徑（demo 素材在 public/，上傳在 var/） */
function localPathFor(storageUrl: string): string | null {
  if (storageUrl.startsWith("/demo/")) return path.join(ROOT, "public", storageUrl);
  if (storageUrl.startsWith("/api/files/"))
    return path.join(ROOT, "var", ...storageUrl.replace("/api/files/", "").split("/"));
  return null;
}

async function toDataUrl(storageUrl: string): Promise<string | null> {
  const p = localPathFor(storageUrl);
  if (!p || !existsSync(p)) return null;
  const buf = await readFile(p);
  return `data:${mimeFor(p)};base64,${buf.toString("base64")}`;
}

async function buildInputProps(videoId: string) {
  const video = await db.video.findUniqueOrThrow({
    where: { id: videoId },
    include: { project: { include: { brand: true, assets: true } } },
  });
  const scenes: Scene[] = parseScenes(video.scenesJson);
  if (scenes.length === 0) throw new Error("影片沒有場景");
  const brand = video.project.brand;

  const assetMap: Record<string, string> = {};
  for (const asset of video.project.assets) {
    const url = await toDataUrl(asset.storageUrl);
    if (url) assetMap[asset.id] = url;
  }
  if (brand.logoUrl) {
    const logo = await toDataUrl(brand.logoUrl);
    if (logo) assetMap["__logo__"] = logo;
  }

  // 配音：先試設定的供應商（如 edge），失敗自動退回 mock，渲染永不因 TTS 中斷
  let tts = getTTSProvider();
  let ttsResult;
  try {
    ttsResult = await tts.synthesize(scenes, video.project.language);
  } catch (err) {
    console.warn(
      `[worker] TTS 供應商 "${tts.name}" 失敗（${err instanceof Error ? err.message : err}），退回 mock 音軌`,
    );
    tts = new (await import("../src/lib/tts")).MockTTSProvider();
    ttsResult = await tts.synthesize(scenes, video.project.language);
  }
  const toUrl = (audio: Buffer, mime: string) =>
    `data:${mime};base64,${audio.toString("base64")}`;
  const voiceoverUrl =
    ttsResult.kind === "track" ? toUrl(ttsResult.audio, ttsResult.mime) : null;
  const voiceClips =
    ttsResult.kind === "clips"
      ? Object.fromEntries(ttsResult.clips.map((c) => [c.sceneId, toUrl(c.audio, c.mime)]))
      : null;
  console.log(`[worker] TTS：${tts.name}（${ttsResult.kind}）`);

  const durationSec = scenes.reduce((s, sc) => s + sc.durationSec, 0);
  const music = samplesToWav(synthMusicTrack(durationSec, scenes.length), SAMPLE_RATE);

  return {
    props: {
      scenes,
      brand: {
        name: brand.name,
        primaryColor: brand.primaryColor,
        secondaryColor: brand.secondaryColor,
        textColor: brand.textColor,
        logoUrl: brand.logoUrl,
      },
      subtitleStyle: video.subtitleStyle,
      assetMap,
      voiceoverUrl,
      voiceClips,
      musicUrl: `data:audio/wav;base64,${music.toString("base64")}`,
      voiceVolume: 1,
      musicVolume: 0.4,
    },
    compositionId: video.aspectRatio === "9:16" ? "Short" : "Master",
    video,
  };
}

async function processJob(jobId: string, serveUrl: string) {
  const started = Date.now();
  await db.renderJob.update({
    where: { id: jobId },
    data: { status: "processing", progress: 0, startedAt: new Date(), errorMessage: null },
  });
  const job = await db.renderJob.findUniqueOrThrow({ where: { id: jobId } });
  const { props, compositionId, video } = await buildInputProps(job.videoId);

  const composition = await selectComposition({
    serveUrl,
    id: compositionId,
    inputProps: props,
  });

  const outDir = path.join(ROOT, "var", "renders");
  mkdirSync(outDir, { recursive: true });
  const outputLocation = path.join(outDir, `${jobId}.mp4`);

  let lastPersisted = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: props,
    onProgress: ({ progress }) => {
      const pct = Math.round(progress * 100);
      if (pct >= lastPersisted + 4 || pct === 100) {
        lastPersisted = pct;
        db.renderJob
          .update({ where: { id: jobId }, data: { progress: pct } })
          .catch(() => {});
      }
    },
  });

  await db.renderJob.update({
    where: { id: jobId },
    data: {
      status: "completed",
      progress: 100,
      outputUrl: `/api/files/renders/${jobId}.mp4`,
      completedAt: new Date(),
    },
  });
  await db.video.update({ where: { id: video.id }, data: { status: "rendered" } });
  console.log(
    `[worker] job ${jobId} done in ${Math.round((Date.now() - started) / 1000)}s → ${outputLocation}`,
  );
}

async function main() {
  console.log("[worker] 準備瀏覽器與 Remotion bundle…");
  await ensureBrowser();
  const serveUrl = await bundle({
    entryPoint: path.join(ROOT, "remotion", "index.ts"),
    onProgress: (p) => {
      if (p % 25 === 0) console.log(`[worker] bundling ${p}%`);
    },
  });
  console.log(`[worker] bundle: ${serveUrl}`);
  console.log("[worker] 就緒，開始輪詢 render_jobs（Ctrl+C 結束）");
  const once = process.env.WORKER_ONCE === "1";

  for (;;) {
    const job = await db.renderJob.findFirst({
      where: { status: "queued" },
      orderBy: { createdAt: "asc" },
    });
    if (!job) {
      if (once) break;
      await new Promise((r) => setTimeout(r, POLL_MS));
      continue;
    }
    try {
      await processJob(job.id, serveUrl);
      if (once) break;
    } catch (err) {
      const message = err instanceof Error ? err.message.slice(0, 500) : "未知錯誤";
      console.error(`[worker] job ${job.id} failed:`, message);
      await db.renderJob.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: message, completedAt: new Date() },
      });
      await db.video
        .update({ where: { id: job.videoId }, data: { status: "scripted" } })
        .catch(() => {});
      if (once) break;
    }
  }
  if (once) {
    await db.$disconnect();
    console.log("[worker] WORKER_ONCE：結束");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
