import { createHash, randomUUID } from "node:crypto";
import WebSocket from "ws";
import type { Scene } from "../ai/schemas";
import type { TTSProvider, TTSResult, TTSClip } from "./index";

/**
 * EdgeTTSProvider — 使用 Microsoft Edge「大聲朗讀」的非官方端點。
 *
 * ⚠ 僅限開發／展示環境：
 * - 這不是有 SLA 的正式 API，微軟隨時可能改協定或擋掉（歷史上發生過多次）。
 * - 正式上線請改接付費供應商（ElevenLabs／Azure Speech），
 *   實作同一個 TTSProvider 介面即可無痛替換（見 src/lib/tts/index.ts）。
 * - 渲染 worker 在此供應商失敗時會自動退回 mock 音軌，不會讓渲染失敗。
 */

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const SEC_MS_GEC_VERSION = "1-132.0.2917.0";
const WSS_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const SYNTH_TIMEOUT_MS = 20_000;

export const EDGE_VOICES: Record<string, string> = {
  "zh-TW": "zh-TW-HsiaoChenNeural",
  en: "en-US-AriaNeural",
};

/**
 * Edge 端點的 DRM token：Windows file-time ticks（取整到 5 分鐘）＋ client token 的 SHA-256。
 * 拆成純函式方便單元測試。
 */
export function generateSecMsGec(unixSeconds: number): string {
  const WIN_EPOCH_OFFSET = 11_644_473_600; // 1601-01-01 → 1970-01-01（秒）
  let ticksSec = unixSeconds + WIN_EPOCH_OFFSET;
  ticksSec -= ticksSec % 300; // 5 分鐘視窗
  const ticks = ticksSec * 10_000_000; // 100ns ticks
  return createHash("sha256")
    .update(`${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`, "ascii")
    .digest("hex")
    .toUpperCase();
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSsml(text: string, voice: string, lang: string): string {
  return (
    `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>` +
    `<voice name='${voice}'><prosody pitch='+0Hz' rate='+0%' volume='+0%'>` +
    escapeXml(text) +
    `</prosody></voice></speak>`
  );
}

/** 解析 Edge 的 binary frame：前 2 bytes 是 header 長度（big-endian）。 */
export function extractAudioChunk(frame: Buffer): Buffer | null {
  if (frame.length < 2) return null;
  const headerLength = frame.readUInt16BE(0);
  if (frame.length < 2 + headerLength) return null;
  const header = frame.subarray(2, 2 + headerLength).toString("utf8");
  if (!header.includes("Path:audio")) return null;
  return frame.subarray(2 + headerLength);
}

async function synthesizeOnce(text: string, voice: string, lang: string): Promise<Buffer> {
  const connectionId = randomUUID().replace(/-/g, "");
  const secMsGec = generateSecMsGec(Date.now() / 1000);
  const url =
    `${WSS_URL}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}` +
    `&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}` +
    `&ConnectionId=${connectionId}`;

  return new Promise<Buffer>((resolve, reject) => {
    // Edge 端點會驗 Origin / User-Agent，原生 WHATWG WebSocket 帶不了自訂 header → 用 ws
    const ws = new WebSocket(url, {
      headers: {
        Pragma: "no-cache",
        "Cache-Control": "no-cache",
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0",
      },
    });
    const chunks: Buffer[] = [];
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      ws.close();
      reject(new Error("edge-tts timeout"));
    }, SYNTH_TIMEOUT_MS);

    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(err instanceof Error ? err : new Error(String(err)));
    };

    ws.on("open", () => {
      const ts = new Date().toISOString();
      ws.send(
        `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
          JSON.stringify({
            context: {
              synthesis: {
                audio: {
                  metadataoptions: {
                    sentenceBoundaryEnabled: "false",
                    wordBoundaryEnabled: "false",
                  },
                  outputFormat: "audio-24khz-48kbitrate-mono-mp3",
                },
              },
            },
          }),
      );
      ws.send(
        `X-RequestId:${connectionId}\r\nContent-Type:application/ssml+xml\r\n` +
          `X-Timestamp:${ts}\r\nPath:ssml\r\n\r\n` +
          buildSsml(text, voice, lang),
      );
    });

    ws.on("message", (data, isBinary) => {
      if (!isBinary) {
        if (data.toString("utf8").includes("Path:turn.end")) {
          settled = true;
          clearTimeout(timer);
          ws.close();
          if (chunks.length === 0) return reject(new Error("edge-tts returned no audio"));
          resolve(Buffer.concat(chunks));
        }
        return;
      }
      const chunk = extractAudioChunk(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer));
      if (chunk && chunk.length > 0) chunks.push(chunk);
    });

    ws.on("unexpected-response", (_req, res) =>
      fail(new Error(`edge-tts handshake ${res.statusCode}`)),
    );
    ws.on("error", (err) => fail(err));
    ws.on("close", (code) => {
      if (chunks.length === 0) fail(new Error(`edge-tts closed (${code})`));
    });
  });
}

export class EdgeTTSProvider implements TTSProvider {
  readonly name = "edge";

  async synthesize(scenes: Scene[], language: string): Promise<TTSResult> {
    const lang = language === "en" ? "en-US" : "zh-TW";
    const voice =
      process.env.EDGE_TTS_VOICE ?? EDGE_VOICES[language] ?? EDGE_VOICES["zh-TW"];
    const clips: TTSClip[] = [];
    for (const scene of scenes) {
      const text = scene.narration.trim();
      if (!text) continue;
      const audio = await synthesizeOnce(text, voice, lang);
      clips.push({ sceneId: scene.id, audio, mime: "audio/mpeg" });
    }
    if (clips.length === 0) throw new Error("no narration to synthesize");
    return { kind: "clips", clips };
  }
}
