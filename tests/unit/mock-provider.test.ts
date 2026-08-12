import { beforeAll, describe, expect, it } from "vitest";
import { MockContentAIProvider, planTiming } from "@/lib/ai/mock-provider";
import { contentStrategySchema } from "@/lib/ai/schemas";
import type { StrategyInput } from "@/lib/ai/types";

const input: StrategyInput = {
  brand: {
    name: "森日茶研",
    industry: "茶飲食品",
    description: "台灣茶品牌",
    audience: "上班族",
    tone: "溫暖",
    defaultCta: "立即預購",
    primaryColor: "#35544A",
    secondaryColor: "#F4EFE6",
    textColor: "#FFFFFF",
  },
  project: {
    name: "測試專案",
    productName: "冷泡烏龍茶禮盒",
    productDescription: "精選台灣高山茶葉，以低溫冷泡工藝帶出甘甜，無糖零負擔。",
    objective: "promotion",
    audience: "25–45 歲上班族",
    sellingPoints: ["台灣茶葉", "低溫冷泡", "無糖"],
    cta: "立即預購企業送禮方案",
    language: "zh-TW",
    style: "warm",
    masterDuration: 90,
    shortVideoCount: 3,
  },
  assets: [{ id: "a1", type: "image", originalName: "hero.png" }],
};

describe("planTiming", () => {
  it.each([60, 90, 120])("場景秒數總和等於 %i", (duration) => {
    const t = planTiming(duration, 3);
    const total = t.hook + t.problem + t.values.reduce((a, b) => a + b, 0) + t.proof.reduce((a, b) => a + b, 0) + t.cta;
    expect(total).toBe(duration);
  });
});

describe("MockContentAIProvider", () => {
  let provider: MockContentAIProvider;
  beforeAll(() => {
    process.env.MOCK_FAST = "1";
    provider = new MockContentAIProvider();
  });

  it("generateStrategy 輸出通過 schema、秒數正確、至少 6 場景", async () => {
    const strategy = await provider.generateStrategy(input);
    expect(() => contentStrategySchema.parse(strategy)).not.toThrow();
    const total = strategy.master.scenes.reduce((s, sc) => s + sc.durationSec, 0);
    expect(total).toBe(90);
    expect(strategy.master.scenes.length).toBeGreaterThanOrEqual(6);
    expect(strategy.shorts).toHaveLength(3);
    for (const short of strategy.shorts) {
      expect(short.hook.length).toBeGreaterThan(0);
      expect(short.cta.length).toBeGreaterThan(0);
      expect(short.scenes.length).toBe(3);
    }
  });

  it("旁白長度符合秒數（每秒 4 字內）", async () => {
    const strategy = await provider.generateStrategy(input);
    for (const scene of strategy.master.scenes) {
      expect(scene.narration.length).toBeLessThanOrEqual(scene.durationSec * 4 + 2);
    }
  });

  it("缺賣點與 CTA 時標記 needsConfirmation", async () => {
    const thin = {
      ...input,
      brand: { ...input.brand, defaultCta: "", audience: "" },
      project: { ...input.project, sellingPoints: [], cta: "", audience: "", productDescription: "" },
    };
    const strategy = await provider.generateStrategy(thin);
    expect(strategy.needsConfirmation.length).toBeGreaterThanOrEqual(3);
  });

  it("敏感產業出現 complianceNote", async () => {
    const medical = {
      ...input,
      brand: { ...input.brand, industry: "醫療器材" },
    };
    const strategy = await provider.generateStrategy(medical);
    expect(strategy.complianceNote).toBeTruthy();
  });

  it("regenerateScene 只改文字欄位", async () => {
    const strategy = await provider.generateStrategy(input);
    const scene = strategy.master.scenes[2];
    const regenerated = await provider.regenerateScene({
      brand: input.brand,
      project: input.project,
      scene,
      sceneIndex: 2,
      sceneCount: strategy.master.scenes.length,
      videoTitle: strategy.master.title,
    });
    expect(regenerated.id).toBe(scene.id);
    expect(regenerated.durationSec).toBe(scene.durationSec);
    expect(regenerated.assetId).toBe(scene.assetId);
  });
});
