import type { Scene } from "../ai/schemas";

/**
 * 純程式合成的 WAV 音軌（mock TTS / 背景音樂用）。
 * 16-bit PCM mono。不依賴任何外部服務或二進位工具。
 */

export const SAMPLE_RATE = 22050;

export function samplesToWav(samples: Float32Array, sampleRate = SAMPLE_RATE): Buffer {
  const dataLength = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataLength);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  return buffer;
}

/** 簡單可重現的偽隨機數（同一輸入產出同一音軌） */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mock 旁白音軌：以每秒約 3.6 個「音節」的低音量脈衝模擬語音節奏，
 * 每個場景用不同基頻，只在有旁白的秒數內發聲。
 * 目的：讓渲染出的 MP4 有對位的人聲節奏軌（demo 用），非真實語音。
 */
export function synthNarrationTrack(scenes: Scene[], sampleRate = SAMPLE_RATE): Float32Array {
  const totalSec = scenes.reduce((s, sc) => s + sc.durationSec, 0);
  const out = new Float32Array(Math.round(totalSec * sampleRate));
  let cursorSec = 0;
  scenes.forEach((scene, idx) => {
    const chars = scene.narration.trim().length;
    if (chars > 0) {
      const base = 170 + (idx % 4) * 22; // 每場景微調基頻
      const syllables = Math.min(chars, Math.floor(scene.durationSec * 3.6));
      const rng = mulberry32(idx * 7919 + chars);
      const speakSec = Math.min(scene.durationSec - 0.4, syllables / 3.6);
      for (let s = 0; s < syllables; s++) {
        const tStart = cursorSec + 0.2 + (s / Math.max(1, syllables)) * speakSec;
        const dur = 0.16 + rng() * 0.08;
        const freq = base * (1 + (rng() - 0.5) * 0.12);
        const startIdx = Math.round(tStart * sampleRate);
        const len = Math.round(dur * sampleRate);
        for (let i = 0; i < len && startIdx + i < out.length; i++) {
          const t = i / sampleRate;
          const env = Math.sin((Math.PI * i) / len); // 攻擊+衰減
          out[startIdx + i] +=
            0.16 *
            env *
            (Math.sin(2 * Math.PI * freq * t) * 0.7 +
              Math.sin(2 * Math.PI * freq * 2 * t) * 0.3);
        }
      }
    }
    cursorSec += scene.durationSec;
  });
  return out;
}

const CHORDS: number[][] = [
  [220.0, 277.18, 329.63], // A major
  [196.0, 246.94, 293.66], // G
  [174.61, 220.0, 261.63], // F
  [196.0, 246.94, 311.13], // Gm-ish
];

/** 背景音樂：緩慢的和弦墊，8 秒換一個和弦，頭尾各 2 秒淡入淡出。 */
export function synthMusicTrack(durationSec: number, seed = 1, sampleRate = SAMPLE_RATE): Float32Array {
  const out = new Float32Array(Math.round(durationSec * sampleRate));
  const rng = mulberry32(seed);
  const order = [...CHORDS].sort(() => rng() - 0.5);
  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    const chord = order[Math.floor(t / 8) % order.length];
    let v = 0;
    for (const f of chord) {
      v += Math.sin(2 * Math.PI * f * t) / chord.length;
      v += 0.35 * Math.sin(2 * Math.PI * (f / 2) * t + 0.4) / chord.length;
    }
    // 和弦交界 0.8 秒交叉淡化，避免爆音
    const inChord = t % 8;
    const edge = Math.min(1, inChord / 0.8, (8 - inChord) / 0.8);
    // 整體頭尾淡入淡出
    const fade = Math.min(1, t / 2, (durationSec - t) / 2);
    out[i] = v * 0.14 * Math.max(0, edge) * Math.max(0, Math.min(1, fade));
  }
  return out;
}

export function mixTracks(a: Float32Array, b: Float32Array, gainA = 1, gainB = 1): Float32Array {
  const len = Math.max(a.length, b.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (a[i] ?? 0) * gainA + (b[i] ?? 0) * gainB;
  }
  return out;
}
