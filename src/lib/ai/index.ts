import { MockContentAIProvider } from "./mock-provider";
import { AnthropicContentAIProvider } from "./anthropic-provider";
import type { ContentAIProvider } from "./types";

let cached: ContentAIProvider | null = null;

/**
 * Provider 工廠：AI_PROVIDER=mock（預設）| anthropic。
 * 設成 anthropic 但沒有金鑰時自動退回 mock，不讓流程中斷（規格 §18-4）。
 */
export function getContentAIProvider(): ContentAIProvider {
  if (cached) return cached;
  const kind = process.env.AI_PROVIDER ?? "mock";
  if (kind === "anthropic") {
    const key = process.env.ANTHROPIC_API_KEY;
    if (key) {
      cached = new AnthropicContentAIProvider(key);
      return cached;
    }
    console.warn("[ai] AI_PROVIDER=anthropic 但缺 ANTHROPIC_API_KEY，退回 mock provider");
  }
  cached = new MockContentAIProvider();
  return cached;
}

export type { ContentAIProvider } from "./types";
