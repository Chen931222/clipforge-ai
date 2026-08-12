import { describe, expect, it } from "vitest";
import type { Scene } from "@/lib/ai/schemas";
import {
  SAMPLE_RATE,
  mixTracks,
  samplesToWav,
  synthMusicTrack,
  synthNarrationTrack,
} from "@/lib/tts/wav";

const scene = (durationSec: number, narration: string): Scene => ({
  id: `s-${durationSec}`,
  durationSec,
  narration,
  title: "t",
  subtitle: "",
  assetId: null,
  assetMode: "cover",
  animation: "fade",
  transition: "fade",
  needsConfirmation: false,
});

describe("samplesToWav", () => {
  it("產生合法 WAV 標頭與長度", () => {
    const wav = samplesToWav(new Float32Array(SAMPLE_RATE)); // 1 秒
    expect(wav.toString("ascii", 0, 4)).toBe("RIFF");
    expect(wav.toString("ascii", 8, 12)).toBe("WAVE");
    expect(wav.readUInt32LE(24)).toBe(SAMPLE_RATE);
    expect(wav.length).toBe(44 + SAMPLE_RATE * 2);
  });
});

describe("synthNarrationTrack", () => {
  it("長度等於場景總秒數且有聲音", () => {
    const track = synthNarrationTrack([scene(3, "測試旁白內容。"), scene(2, "第二段。")]);
    expect(track.length).toBe(5 * SAMPLE_RATE);
    const energy = track.reduce((s, v) => s + Math.abs(v), 0);
    expect(energy).toBeGreaterThan(0);
  });
  it("沒有旁白時輸出靜音", () => {
    const track = synthNarrationTrack([scene(2, "")]);
    expect(track.every((v) => v === 0)).toBe(true);
  });
});

describe("synthMusicTrack / mixTracks", () => {
  it("音樂長度正確且不爆音", () => {
    const music = synthMusicTrack(10, 3);
    expect(music.length).toBe(10 * SAMPLE_RATE);
    for (let i = 0; i < music.length; i += 997) {
      expect(Math.abs(music[i])).toBeLessThanOrEqual(1);
    }
  });
  it("混音取最長長度", () => {
    const mixed = mixTracks(new Float32Array(10), new Float32Array(20), 1, 0.5);
    expect(mixed.length).toBe(20);
  });
});
