import { AppError } from "../errors";
import {
  contentStrategySchema,
  sceneSchema,
  socialCopySchema,
  type ContentStrategy,
  type Scene,
  type SocialCopy,
} from "./schemas";
import {
  STRATEGY_SHAPE_HINT,
  SYSTEM_PROMPT,
  regenerateSceneUserPrompt,
  socialCopyUserPrompt,
  strategyUserPrompt,
} from "./prompts";
import type {
  ContentAIProvider,
  RegenerateSceneInput,
  SocialCopyInput,
  StrategyInput,
} from "./types";
import type { ZodType } from "zod";

const API_URL = "https://api.anthropic.com/v1/messages";

/** 從模型輸出中撈出 JSON（容忍 markdown 圍欄與前後贅字），失敗回 null。 */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  try {
    return JSON.parse(candidate.slice(start));
  } catch {
    return null;
  }
}

export class AnthropicContentAIProvider implements ContentAIProvider {
  readonly name = "anthropic";
  private readonly apiKey: string;
  private readonly model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  }

  private async call(userPrompt: string, maxTokens: number): Promise<string> {
    const started = Date.now();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: maxTokens,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!res.ok) {
      // 不把供應商錯誤細節帶給前端
      console.error(`[ai] anthropic error status=${res.status}`);
      throw new AppError("provider_error", 502, "AI 服務暫時無法使用，請稍後再試");
    }
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    // 記錄模型、耗時與 token 用量；絕不記錄 API Key（規格 §9）
    console.log(
      `[ai] model=${this.model} ms=${Date.now() - started} in=${data.usage?.input_tokens ?? "?"} out=${data.usage?.output_tokens ?? "?"}`,
    );
    return data.content?.find((c) => c.type === "text")?.text ?? "";
  }

  /** 呼叫一次；JSON 不合法或未過 schema 時附錯誤重試一次（規格 §9）。 */
  private async callValidated<T>(
    userPrompt: string,
    schema: ZodType<T>,
    maxTokens: number,
  ): Promise<T> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const prompt =
        attempt === 0
          ? userPrompt
          : `${userPrompt}\n\n上一次輸出的 JSON 不符合結構要求，請修正後重新輸出完整 JSON。`;
      const text = await this.call(prompt, maxTokens);
      const json = extractJson(text);
      if (json !== null) {
        const parsed = schema.safeParse(json);
        if (parsed.success) return parsed.data;
        console.warn(`[ai] schema mismatch on attempt ${attempt + 1}`);
      }
    }
    throw new AppError("provider_error", 502, "AI 輸出格式異常，請再試一次");
  }

  async generateStrategy(input: StrategyInput): Promise<ContentStrategy> {
    return this.callValidated(
      strategyUserPrompt(input, STRATEGY_SHAPE_HINT),
      contentStrategySchema,
      8000,
    );
  }

  async regenerateScene(input: RegenerateSceneInput): Promise<Scene> {
    return this.callValidated(regenerateSceneUserPrompt(input), sceneSchema, 1000);
  }

  async generateSocialCopy(input: SocialCopyInput): Promise<SocialCopy> {
    return this.callValidated(socialCopyUserPrompt(input), socialCopySchema, 2000);
  }
}
