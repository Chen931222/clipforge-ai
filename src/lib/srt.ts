import type { Scene } from "./ai/schemas";

export interface SubtitleCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/** 依標點切句；超過 maxChars 的句子再硬切。 */
export function splitNarration(narration: string, maxChars = 18): string[] {
  const trimmed = narration.trim();
  if (!trimmed) return [];
  const sentences = trimmed
    .split(/(?<=[。！？!?；;])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= maxChars) {
      chunks.push(sentence);
      continue;
    }
    // 先試逗號，再硬切
    const parts = sentence.split(/(?<=[，,、])/).map((s) => s.trim()).filter(Boolean);
    let buf = "";
    for (const part of parts) {
      if ((buf + part).length <= maxChars) {
        buf += part;
      } else {
        if (buf) chunks.push(buf);
        if (part.length <= maxChars) {
          buf = part;
        } else {
          for (let i = 0; i < part.length; i += maxChars) {
            const piece = part.slice(i, i + maxChars);
            if (i + maxChars >= part.length) buf = piece;
            else chunks.push(piece);
          }
        }
      }
    }
    if (buf) chunks.push(buf);
  }
  return chunks;
}

/**
 * 根據場景旁白與秒數產生字幕時間碼（規格 §4.5）。
 * 每場景的時間依各字幕塊字數比例分配。
 */
export function buildSubtitleCues(scenes: Scene[]): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  let cursorMs = 0;
  let index = 1;
  for (const scene of scenes) {
    const sceneMs = Math.round(scene.durationSec * 1000);
    const chunks = splitNarration(scene.narration);
    if (chunks.length === 0) {
      cursorMs += sceneMs;
      continue;
    }
    const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
    let innerCursor = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const share =
        i === chunks.length - 1
          ? sceneMs - innerCursor
          : Math.round((chunk.length / totalChars) * sceneMs);
      cues.push({
        index: index++,
        startMs: cursorMs + innerCursor,
        endMs: cursorMs + innerCursor + share,
        text: chunk,
      });
      innerCursor += share;
    }
    cursorMs += sceneMs;
  }
  return cues;
}

export function formatSrtTimestamp(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const h = Math.floor(clamped / 3_600_000);
  const m = Math.floor((clamped % 3_600_000) / 60_000);
  const s = Math.floor((clamped % 60_000) / 1000);
  const milli = clamped % 1000;
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(milli, 3)}`;
}

export function toSrt(cues: SubtitleCue[]): string {
  return cues
    .map(
      (cue) =>
        `${cue.index}\n${formatSrtTimestamp(cue.startMs)} --> ${formatSrtTimestamp(cue.endMs)}\n${cue.text}\n`,
    )
    .join("\n");
}

/** mm:ss 的 timecode（cue sheet 顯示用） */
export function formatTimecode(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export function totalDuration(scenes: Scene[]): number {
  return scenes.reduce((sum, s) => sum + s.durationSec, 0);
}
