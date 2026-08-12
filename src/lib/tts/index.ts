import type { Scene } from "../ai/schemas";
import { EdgeTTSProvider } from "./edge";
import { SAMPLE_RATE, samplesToWav, synthNarrationTrack } from "./wav";

export interface TTSClip {
  sceneId: string;
  audio: Buffer;
  mime: string;
}

/**
 * TTS 合成結果兩種形態：
 * - track：一條與影片等長、已對位的整軌（mock 使用）
 * - clips：每個場景一段語音，渲染時放在該場景起點（真 TTS 使用）
 */
export type TTSResult =
  | { kind: "track"; audio: Buffer; mime: string }
  | { kind: "clips"; clips: TTSClip[] };

/**
 * TTS 供應商抽象（規格 §4.5）。
 * - mock：不需金鑰，合成與旁白節奏對位的音軌，流程永遠能跑。
 * - edge：Microsoft Edge 朗讀端點（非官方、僅限開發／展示，見 edge.ts 註解）。
 * - 之後接付費供應商（ElevenLabs／Azure）時實作同一介面即可替換。
 */
export interface TTSProvider {
  readonly name: string;
  synthesize(scenes: Scene[], language: string): Promise<TTSResult>;
}

export class MockTTSProvider implements TTSProvider {
  readonly name = "mock";

  async synthesize(scenes: Scene[], _language: string): Promise<TTSResult> {
    const samples = synthNarrationTrack(scenes);
    return { kind: "track", audio: samplesToWav(samples, SAMPLE_RATE), mime: "audio/wav" };
  }
}

export function getTTSProvider(): TTSProvider {
  const kind = process.env.TTS_PROVIDER ?? "mock";
  if (kind === "edge") {
    return new EdgeTTSProvider();
  }
  if (kind !== "mock") {
    console.warn(`[tts] 供應商 "${kind}" 尚未實作，退回 mock`);
  }
  return new MockTTSProvider();
}
