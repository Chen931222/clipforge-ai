import type { Scene } from "./ai/schemas";

export interface SubtitleCue {
  index: number;
  startMs: number;
  endMs: number;
  text: string;
}

/** 含中日韓字元即視為中文排版（每字寬度接近全形）。 */
const CJK_RE = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;

/**
 * 句末切點：中文標點直接切；英文的 .!?; 只在後面接空白時才切，
 * 否則 "Next.js"、"1.5" 這種會被切斷。
 */
const SENTENCE_BREAK = /(?<=[。！？；])|(?<=[.!?;])(?=\s)/;
/** 子句切點：中英文逗號、頓號、冒號、破折號後 */
const CLAUSE_BREAK = /(?<=[，、；])|(?<=[,;:])(?=\s)|(?<=—)/;

/** 把過長的片段再切小。英文一律在詞邊界斷，中文才逐字硬切。 */
function breakLongPart(text: string, limit: number, cjk: boolean): string[] {
  if (text.length <= limit) return [text];
  if (!cjk && /\s/.test(text)) {
    const out: string[] = [];
    let buf = "";
    for (const word of text.split(/\s+/)) {
      if (!buf) {
        buf = word; // 單字本身超長也保持完整——寧可稍微超寬也不切斷單字
      } else if (`${buf} ${word}`.length <= limit) {
        buf = `${buf} ${word}`;
      } else {
        out.push(buf);
        buf = word;
      }
    }
    if (buf) out.push(buf);
    return out;
  }
  const out: string[] = [];
  for (let i = 0; i < text.length; i += limit) out.push(text.slice(i, i + limit));
  return out;
}

/**
 * 依標點切成字幕塊；過長的句子再依詞邊界（英文）或字數（中文）切分。
 *
 * maxChars 未指定時依語系決定，兩者都是「一則字幕」的上限：
 * - 中文 18：全形字每行約 18 字滿版（沿用已驗證的中文成品設定）。
 * - 英文 84：業界慣例每行 42 字元、每則最多兩行；字幕帶本來就預留兩行高度。
 *   若誤用中文的 18 去切英文，會切成三個字一塊且斷在單字中間。
 */
export function splitNarration(narration: string, maxChars?: number): string[] {
  const trimmed = narration.trim();
  if (!trimmed) return [];
  const cjk = CJK_RE.test(trimmed);
  const limit = maxChars ?? (cjk ? 18 : 84);
  const join = (a: string, b: string) => (cjk ? a + b : `${a} ${b}`);

  const sentences = trimmed
    .split(SENTENCE_BREAK)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= limit) {
      chunks.push(sentence);
      continue;
    }
    const parts = sentence.split(CLAUSE_BREAK).map((s) => s.trim()).filter(Boolean);
    let buf = "";
    for (const part of parts) {
      const merged = buf ? join(buf, part) : part;
      if (merged.length <= limit) {
        buf = merged;
        continue;
      }
      if (buf) {
        chunks.push(buf);
        buf = "";
      }
      const pieces = breakLongPart(part, limit, cjk);
      chunks.push(...pieces.slice(0, -1));
      buf = pieces[pieces.length - 1];
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
