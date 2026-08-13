import { describe, expect, it } from "vitest";
import type { Scene } from "@/lib/ai/schemas";
import {
  buildSubtitleCues,
  formatSrtTimestamp,
  formatTimecode,
  splitNarration,
  toSrt,
  totalDuration,
} from "@/lib/srt";

const scene = (over: Partial<Scene>): Scene => ({
  id: "s-test",
  durationSec: 10,
  narration: "",
  title: "測試",
  subtitle: "",
  assetId: null,
  assetMode: "cover",
  animation: "fade",
  transition: "fade",
  needsConfirmation: false,
  ...over,
});

describe("splitNarration", () => {
  it("依句號切句", () => {
    expect(splitNarration("第一句。第二句。")).toEqual(["第一句。", "第二句。"]);
  });
  it("超長句子會再切", () => {
    const long = "這是一段非常長的句子，用來測試字幕切分，應該被切成多塊而不是一整條。";
    const chunks = splitNarration(long, 18);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(18);
  });
  it("空字串回空陣列", () => {
    expect(splitNarration("  ")).toEqual([]);
  });
  it("英文依句號切句", () => {
    expect(splitNarration("First line here. Second line here.")).toEqual([
      "First line here.",
      "Second line here.",
    ]);
  });
  it("英文長句斷在詞邊界，不切斷單字", () => {
    const long =
      "Hiring a developer usually means weeks of scoping calls, vague estimates, and a demo that only works on someone else's laptop.";
    const chunks = splitNarration(long);
    expect(chunks.length).toBeGreaterThan(1);
    // 每塊都必須是完整單字組成——重組後與原句的單字序列一致
    expect(chunks.join(" ").split(/\s+/)).toEqual(long.split(/\s+/));
    for (const c of chunks) {
      expect(c.trim()).toBe(c);
      expect(c.length).toBeLessThanOrEqual(84);
    }
  });
  it("英文不因中文字數上限被切碎", () => {
    // 舊版用 18 字元硬切，會產生 "This video was mad" / "e by an AI product"
    const chunks = splitNarration("This video was made by an AI product I built.");
    expect(chunks).toEqual(["This video was made by an AI product I built."]);
  });
  it("不在 Next.js 這類小數點／檔名處斷句", () => {
    expect(splitNarration("Built with Next.js and TypeScript.")).toEqual([
      "Built with Next.js and TypeScript.",
    ]);
  });
});

describe("buildSubtitleCues", () => {
  it("時間碼覆蓋整個場景且不重疊", () => {
    const scenes = [
      scene({ durationSec: 5, narration: "第一場景的旁白。" }),
      scene({ id: "s2", durationSec: 10, narration: "第二場景第一句。第二場景第二句。" }),
    ];
    const cues = buildSubtitleCues(scenes);
    expect(cues[0].startMs).toBe(0);
    // 第二場景的字幕從 5000ms 開始
    const second = cues.filter((c) => c.startMs >= 5000);
    expect(second.length).toBeGreaterThanOrEqual(2);
    expect(cues.at(-1)!.endMs).toBe(15000);
    for (let i = 1; i < cues.length; i++) {
      expect(cues[i].startMs).toBeGreaterThanOrEqual(cues[i - 1].endMs);
    }
  });
  it("沒有旁白的場景不產生字幕但佔時間", () => {
    const cues = buildSubtitleCues([
      scene({ durationSec: 4, narration: "" }),
      scene({ id: "s2", durationSec: 4, narration: "有字。" }),
    ]);
    expect(cues).toHaveLength(1);
    expect(cues[0].startMs).toBe(4000);
  });
});

describe("formatSrtTimestamp / toSrt", () => {
  it("格式正確", () => {
    expect(formatSrtTimestamp(0)).toBe("00:00:00,000");
    expect(formatSrtTimestamp(65_432)).toBe("00:01:05,432");
    expect(formatSrtTimestamp(3_600_000)).toBe("01:00:00,000");
  });
  it("SRT 內容包含編號與時間軸", () => {
    const srt = toSrt(buildSubtitleCues([scene({ durationSec: 5, narration: "測試字幕。" })]));
    expect(srt).toContain("1\n00:00:00,000 --> 00:00:05,000\n測試字幕。");
  });
});

describe("timecode helpers", () => {
  it("formatTimecode", () => {
    expect(formatTimecode(90)).toBe("01:30");
    expect(formatTimecode(0)).toBe("00:00");
  });
  it("totalDuration", () => {
    expect(totalDuration([scene({ durationSec: 5 }), scene({ id: "b", durationSec: 7 })])).toBe(12);
  });
});
