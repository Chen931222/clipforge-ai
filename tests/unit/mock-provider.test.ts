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

/** 英文專案輸出不該有中日韓文字：U+3040–30FF（含中點「・」）、3400–4DBF、4E00–9FFF、F900–FAFF。 */
const CJK_CHARS = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;
/** 也不該有全形／中文標點：U+3000–303F（。、【】）、FF00–FF60（，｜）、FFE0–FFE6。 */
const CJK_PUNCT = /[　-〿＀-｠￠-￦]/;

/** 英文旁白預算：每秒約 2.3 個單字，單字平均 5.5 字元加一個空格。 */
const enBudget = (durationSec: number) => Math.max(24, Math.round(durationSec * 2.3 * 6.5));

/** 英文句子不該停在虛詞上（"…the same as the one we." 這種沒收乾淨的裁切）。 */
const DANGLING_TAIL =
  /\s(a|an|the|and|or|but|of|to|in|on|at|for|with|from|by|so|as|than|that|is|are|was|were|be|been|it|its|we|you|your|our|they|their|this|these|those)[.!?]$/i;

const enInput: StrategyInput = {
  brand: {
    name: "Kettle & Co",
    industry: "specialty coffee",
    description: "A small-batch coffee roaster in Taipei.",
    audience: "office teams",
    tone: "warm",
    defaultCta: "Order a sample box",
    primaryColor: "#35544A",
    secondaryColor: "#F4EFE6",
    textColor: "#FFFFFF",
  },
  project: {
    name: "EN locale project",
    productName: "Cold Brew Gift Box",
    productDescription:
      "Single-origin beans, cold brewed for 16 hours and bottled without sugar, so every glass tastes the same as the one we pour at the roastery.",
    objective: "promotion",
    audience: "office teams",
    sellingPoints: ["Single-origin beans", "Cold brewed for 16 hours", "No added sugar"],
    cta: "Order the corporate gift set",
    language: "en",
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

describe("MockContentAIProvider（英文專案）", () => {
  let provider: MockContentAIProvider;
  beforeAll(() => {
    process.env.MOCK_FAST = "1";
    provider = new MockContentAIProvider();
  });

  it("整份企劃不含任何中文字或全形標點", async () => {
    const strategy = await provider.generateStrategy(enInput);
    expect(() => contentStrategySchema.parse(strategy)).not.toThrow();
    const dump = JSON.stringify(strategy);
    expect(dump).not.toMatch(CJK_CHARS);
    expect(dump).not.toMatch(CJK_PUNCT);
  });

  it("賣點場景的旁白不是標題原句照抄", async () => {
    const strategy = await provider.generateStrategy(enInput);
    const valueScenes = strategy.master.scenes.filter((s) =>
      enInput.project.sellingPoints.some((p) => s.title === p),
    );
    expect(valueScenes.length).toBeGreaterThan(0);
    for (const s of valueScenes) {
      // 中文分支會接一句轉折，英文分支不該只是把標題再唸一次
      expect(s.narration.replace(/[.\s]+$/, "")).not.toBe(s.title.replace(/[.\s]+$/, ""));
      expect(s.narration.startsWith(s.title.replace(/[.\s]+$/, ""))).toBe(true);
    }
  });

  it("受眾嵌進句中時降回小寫，縮寫保持原樣", async () => {
    const common = await provider.generateStrategy({
      ...enInput,
      project: { ...enInput.project, audience: "Office managers and home hosts" },
    });
    expect(JSON.stringify(common)).toContain("For office managers and home hosts");

    const acronym = await provider.generateStrategy({
      ...enInput,
      project: { ...enInput.project, audience: "CTOs at Series A startups" },
    });
    expect(JSON.stringify(acronym)).toContain("For CTOs at Series A startups");
  });

  it("缺料的英文專案也不會漏中文（needsConfirmation／痛點／核心訊息／短片 CTA）", async () => {
    const thin = {
      ...enInput,
      brand: { ...enInput.brand, defaultCta: "", audience: "" },
      project: {
        ...enInput.project,
        sellingPoints: [],
        cta: "",
        audience: "",
        productDescription: "",
      },
    };
    const strategy = await provider.generateStrategy(thin);
    const dump = JSON.stringify(strategy);
    expect(dump).not.toMatch(CJK_CHARS);
    expect(dump).not.toMatch(CJK_PUNCT);
    expect(strategy.needsConfirmation.length).toBeGreaterThanOrEqual(3);
    expect(strategy.painPoints.length).toBeGreaterThanOrEqual(1);
    expect(strategy.coreMessages.length).toBeGreaterThanOrEqual(1);
    // 短片 CTA 沒有任何來源時，退路必須是英文
    for (const short of strategy.shorts) {
      expect(short.cta).toBe(`Learn more about ${enInput.project.productName}`);
    }
  });

  it("旁白照英文語速裁切，句尾完整、不切在單字中間", async () => {
    const strategy = await provider.generateStrategy(enInput);
    for (const scene of strategy.master.scenes) {
      expect(scene.narration.length).toBeLessThanOrEqual(enBudget(scene.durationSec) + 2);
      expect(scene.narration).toMatch(/[.!?]$/);
    }
    // 使用場景旁白會超出預算而被裁切：保留的部分必須停在單字邊界
    const proof = strategy.master.scenes.filter((s) => s.title === "In real life")[0];
    const prefix = "Where it fits: ";
    expect(proof.narration.startsWith(prefix)).toBe(true);
    const kept = proof.narration.slice(prefix.length).replace(/\.$/, "");
    expect(kept.length).toBeLessThan(enInput.project.productDescription.length);
    expect(enInput.project.productDescription.startsWith(kept)).toBe(true);
    expect(enInput.project.productDescription.charAt(kept.length)).not.toMatch(/[A-Za-z0-9]/);
  });

  it("縮圖標題是完整單字，不套中文字數預算", async () => {
    const strategy = await provider.generateStrategy(enInput);
    const titles = strategy.socialCopy.thumbnailTitles;
    // 舊的 slice(0, 12) 會切成 "Cold Brew Gi"
    expect(titles[0]).toBe(enInput.project.productName);
    for (const title of titles) {
      expect(title).not.toMatch(CJK_CHARS);
      expect(title).not.toMatch(CJK_PUNCT);
    }
    const ctaTitle = titles[2];
    expect(enInput.project.cta.startsWith(ctaTitle)).toBe(true);
    expect(enInput.project.cta.charAt(ctaTitle.length)).not.toMatch(/[A-Za-z0-9]/);
  });

  it("社群文案有英文分支：hashtag 來自產品本身、無中文樣板", async () => {
    const copy = await provider.generateSocialCopy({
      brand: enInput.brand,
      project: enInput.project,
      masterTitle: `${enInput.project.productName} — ${enInput.brand.name}`,
    });
    const dump = JSON.stringify(copy);
    expect(dump).not.toMatch(CJK_CHARS);
    expect(dump).not.toMatch(CJK_PUNCT);
    expect(copy.hashtags.length).toBeGreaterThanOrEqual(3);
    expect(copy.hashtags).toContain("ColdBrewGiftBox");
    expect(copy.hashtags).toContain("KettleCo");
    expect(copy.hashtags).toContain("SingleOriginBeans");
    expect(copy.instagram).toContain("Link in bio.");
    expect(copy.youtubeDescription).toContain("- Single-origin beans");
  });

  it("英文短影音每支有自己的 hook", async () => {
    const strategy = await provider.generateStrategy(enInput);
    const hooks = strategy.shorts.map((s) => s.hook);
    expect(new Set(hooks).size).toBe(hooks.length);
    const titles = strategy.shorts.map((s) => s.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const short of strategy.shorts) {
      const dump = JSON.stringify(short);
      expect(dump).not.toMatch(CJK_CHARS);
      expect(dump).not.toMatch(CJK_PUNCT);
    }
  });

  it("英文敏感產業一樣觸發 complianceNote，且是英文", async () => {
    const medical = {
      ...enInput,
      brand: { ...enInput.brand, industry: "medical devices" },
    };
    const strategy = await provider.generateStrategy(medical);
    expect(strategy.complianceNote).toBeTruthy();
    expect(strategy.complianceNote).not.toMatch(CJK_CHARS);
    const clean = await provider.generateStrategy(enInput);
    expect(clean.complianceNote).toBeNull();
  });

  it("regenerateScene 在英文專案輸出英文且不超出預算", async () => {
    const strategy = await provider.generateStrategy(enInput);
    for (const scene of strategy.master.scenes) {
      // 三種改寫版本都要走到
      for (const sceneIndex of [0, 1, 2]) {
        const regenerated = await provider.regenerateScene({
          brand: enInput.brand,
          project: enInput.project,
          scene,
          sceneIndex,
          sceneCount: strategy.master.scenes.length,
          videoTitle: strategy.master.title,
        });
        expect(regenerated.narration).not.toMatch(CJK_CHARS);
        expect(regenerated.narration).not.toMatch(CJK_PUNCT);
        expect(regenerated.narration).toMatch(/[.!?]$/);
        expect(regenerated.narration.length).toBeLessThanOrEqual(enBudget(scene.durationSec) + 2);
      }
    }
  });

  it("被裁切的旁白收在句子或子句邊界，不會停在虛詞上", async () => {
    const strategy = await provider.generateStrategy(enInput);
    const narrations = [
      ...strategy.master.scenes.map((s) => s.narration),
      ...strategy.shorts.flatMap((s) => s.scenes.map((x) => x.narration)),
    ];
    for (const narration of narrations) {
      expect(narration).not.toMatch(DANGLING_TAIL);
      // 裁切後不該留下懸空的逗號或冒號
      expect(narration).not.toMatch(/[,;:]\s*[.!?]$/);
    }
    // 使用場景旁白超出預算，應該收在賣點的子句邊界而不是句子中間
    const proof = strategy.master.scenes.filter((s) => s.title === "In real life")[0];
    expect(proof.narration).toBe(
      "Where it fits: Single-origin beans, cold brewed for 16 hours and bottled without sugar.",
    );
  });

  it("CTA 以括號結尾時仍補上句號", async () => {
    const bracketed = {
      ...enInput,
      project: { ...enInput.project, cta: "Order now (limited run)" },
    };
    const strategy = await provider.generateStrategy(bracketed);
    const ctaScenes = [
      strategy.master.scenes[strategy.master.scenes.length - 1],
      ...strategy.shorts.map((s) => s.scenes[s.scenes.length - 1]),
    ];
    for (const scene of ctaScenes) {
      expect(scene.narration).toContain("Order now (limited run).");
      expect(scene.narration).toMatch(/[.!?]$/);
    }
  });

  it("縮圖標題超過預算時切在單字邊界，不留半個字", async () => {
    const longCta = {
      ...enInput,
      project: { ...enInput.project, cta: "Order the corporate gift set before December 20" },
    };
    const copy = await provider.generateSocialCopy({
      brand: longCta.brand,
      project: longCta.project,
      masterTitle: `${longCta.project.productName} — ${longCta.brand.name}`,
    });
    const ctaTitle = copy.thumbnailTitles[2];
    expect(ctaTitle.length).toBeLessThanOrEqual(30);
    expect(ctaTitle.length).toBeLessThan(longCta.project.cta.length);
    expect(longCta.project.cta.startsWith(ctaTitle)).toBe(true);
    expect(longCta.project.cta.charAt(ctaTitle.length)).not.toMatch(/[A-Za-z0-9]/);
  });

  it("產品名與受眾接近輸入上限時，英文句型不會撞破 schema 長度限制", async () => {
    // 英文句型比中文長，同一份輸入中文塞得下、英文會超過上限
    const stress: StrategyInput = {
      ...enInput,
      brand: {
        ...enInput.brand,
        name: "Kettle & Co Specialty Coffee Roasters Taipei",
        defaultCta: "",
      },
      project: {
        ...enInput.project,
        productName: "Single-Origin Cold Brew Coffee Gift Box Reserve Edition",
        audience:
          "office managers and HR teams at companies with 50-500 employees who order gifts quarterly",
        cta: "",
      },
    };
    const strategy = await provider.generateStrategy(stress);
    expect(() => contentStrategySchema.parse(strategy)).not.toThrow();
    expect(strategy.strategyOneLiner.length).toBeLessThanOrEqual(120);
    expect(strategy.master.title.length).toBeLessThanOrEqual(80);
    // 品牌名塞不下時整段拿掉，不留半個品牌名
    expect(strategy.master.title).toBe(stress.project.productName);
    for (const short of strategy.shorts) {
      expect(short.title.length).toBeLessThanOrEqual(60);
      expect(short.hook.length).toBeLessThanOrEqual(120);
      expect(short.body.length).toBeLessThanOrEqual(300);
      expect(short.cta.length).toBeLessThanOrEqual(60);
      for (const scene of short.scenes) expect(scene.title.length).toBeLessThanOrEqual(60);
    }
    for (const scene of strategy.master.scenes) {
      expect(scene.title.length).toBeLessThanOrEqual(60);
      expect(scene.narration.length).toBeLessThanOrEqual(400);
    }
  });
});
