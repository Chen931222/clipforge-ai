import { describe, expect, it } from "vitest";
import { escapeXml, extractAudioChunk, generateSecMsGec } from "@/lib/tts/edge";
import { exportKindSchema } from "@/lib/events";

describe("generateSecMsGec", () => {
  it("同一個 5 分鐘視窗內產生相同 token", () => {
    const t = 1_754_900_100; // 任意時刻
    const windowStart = t - (t % 300);
    expect(generateSecMsGec(windowStart)).toBe(generateSecMsGec(windowStart + 299));
    expect(generateSecMsGec(windowStart)).not.toBe(generateSecMsGec(windowStart + 300));
  });
  it("輸出 64 碼大寫 hex", () => {
    expect(generateSecMsGec(1_754_900_100)).toMatch(/^[0-9A-F]{64}$/);
  });
});

describe("extractAudioChunk", () => {
  it("解析含 Path:audio 的 binary frame", () => {
    const header = Buffer.from("X-RequestId:abc\r\nPath:audio\r\n", "utf8");
    const payload = Buffer.from([1, 2, 3, 4]);
    const frame = Buffer.concat([
      Buffer.from([header.length >> 8, header.length & 0xff]),
      header,
      payload,
    ]);
    expect(extractAudioChunk(frame)).toEqual(payload);
  });
  it("非 audio frame 回 null", () => {
    const header = Buffer.from("Path:turn.start\r\n", "utf8");
    const frame = Buffer.concat([
      Buffer.from([header.length >> 8, header.length & 0xff]),
      header,
    ]);
    expect(extractAudioChunk(frame)).toBeNull();
    expect(extractAudioChunk(Buffer.from([0]))).toBeNull();
  });
});

describe("escapeXml", () => {
  it("跳脫五種保留字元", () => {
    expect(escapeXml(`<a & "b" 'c'>`)).toBe("&lt;a &amp; &quot;b&quot; &apos;c&apos;&gt;");
  });
});

describe("exportKindSchema", () => {
  it("只接受五種輸出類型", () => {
    for (const k of ["mp4", "srt", "script", "json", "copy"]) {
      expect(exportKindSchema.parse(k)).toBe(k);
    }
    expect(() => exportKindSchema.parse("pdf")).toThrow();
  });
});
