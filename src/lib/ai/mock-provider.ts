import { randomUUID } from "node:crypto";
import {
  contentStrategySchema,
  sceneSchema,
  socialCopySchema,
  type ContentStrategy,
  type Scene,
  type ShortScript,
  type SocialCopy,
} from "./schemas";
import type {
  ContentAIProvider,
  RegenerateSceneInput,
  SocialCopyInput,
  StrategyInput,
} from "./types";

/**
 * MockContentAIProvider：不需要任何金鑰即可跑完整流程。
 * 以模板＋輸入資料組合出結構化企劃；只使用使用者提供的事實，
 * 缺料時以中性表述帶過並記入 needsConfirmation。
 */

const sceneId = () => `s-${randomUUID().slice(0, 8)}`;

const STYLE_TONES: Record<string, { hookPrefix: string; ctaVerb: string; closing: string }> = {
  professional: { hookPrefix: "為什麼越來越多團隊選擇", ctaVerb: "了解", closing: "讓專業，被看見。" },
  tech: { hookPrefix: "重新定義你對", ctaVerb: "體驗", closing: "下一步，從這裡開始。" },
  warm: { hookPrefix: "好東西值得慢慢認識——", ctaVerb: "認識", closing: "把好的日常，留給重要的人。" },
  playful: { hookPrefix: "先說結論：你會想要", ctaVerb: "試試", closing: "心動不如行動。" },
  premium: { hookPrefix: "真正的講究，藏在細節裡——", ctaVerb: "預約", closing: "為懂的人準備。" },
  minimal: { hookPrefix: "一件事，做到最好——", ctaVerb: "了解", closing: "少即是多。" },
};

const OBJECTIVE_ANGLES: Record<string, string> = {
  expo: "展會現場三十秒抓住路過目光",
  promotion: "把主打賣點講成一個好懂的故事",
  branding: "讓品牌的態度先於產品被記住",
  conversion: "看完就知道去哪裡、怎麼買",
  education: "把知識講明白，讓信任自然發生",
};

function clampNarration(text: string, durationSec: number): string {
  // 中文口語約每秒 4 字。
  const maxChars = Math.max(10, Math.floor(durationSec * 4));
  if (text.length <= maxChars) return text;
  // 回退到最後一個標點，避免把詞切一半
  const head = text.slice(0, maxChars);
  const cut = Math.max(
    head.lastIndexOf("。"),
    head.lastIndexOf("，"),
    head.lastIndexOf("、"),
    head.lastIndexOf("——"),
  );
  if (cut >= Math.floor(maxChars * 0.4)) {
    return `${head.slice(0, cut).replace(/[，、—]+$/, "")}。`;
  }
  return `${head.slice(0, maxChars - 1)}。`;
}

interface TimingPlan {
  hook: number;
  problem: number;
  values: number[];
  proof: number[];
  cta: number;
}

export function planTiming(masterDuration: number, valueCount: number): TimingPlan {
  const hook = 5;
  const cta = Math.min(10, Math.max(5, Math.round(masterDuration * 0.1)));
  const problem = Math.round(masterDuration * 0.16);
  const proofTotal = Math.round(masterDuration * 0.2);
  const valueTotal = masterDuration - hook - cta - problem - proofTotal;
  const values: number[] = [];
  let remaining = valueTotal;
  for (let i = 0; i < valueCount; i++) {
    const d = Math.round(remaining / (valueCount - i));
    values.push(d);
    remaining -= d;
  }
  const proof =
    proofTotal >= 16
      ? [Math.floor(proofTotal / 2), Math.ceil(proofTotal / 2)]
      : [proofTotal];
  return { hook, problem, values, proof, cta };
}

function pickAsset(assets: StrategyInput["assets"], index: number): string | null {
  const images = assets.filter((a) => a.type === "image");
  if (images.length === 0) return null;
  return images[index % images.length].id;
}

function buildMasterScenes(input: StrategyInput): Scene[] {
  const { brand, project, assets } = input;
  const tone = STYLE_TONES[project.style] ?? STYLE_TONES.warm;
  const points = project.sellingPoints.filter((p) => p.trim().length > 0);
  const valueCount = Math.min(3, Math.max(1, points.length || 3));
  const timing = planTiming(project.masterDuration, valueCount);
  const en = project.language === "en";
  const scenes: Scene[] = [];
  let assetCursor = 0;

  const thin = project.productDescription.trim().length < 20;

  // 1) Hook（0–5 秒）
  scenes.push(
    sceneSchema.parse({
      id: sceneId(),
      durationSec: timing.hook,
      narration: en
        ? `Meet ${project.productName} — by ${brand.name}.`
        : clampNarration(`${tone.hookPrefix}${project.productName}。`, timing.hook),
      title: project.productName,
      subtitle: brand.name,
      assetId: pickAsset(assets, assetCursor++),
      assetMode: "cover",
      animation: "zoom",
      transition: "cut",
      backgroundColor: brand.primaryColor,
    }),
  );

  // 2) 問題／情境
  const audience = project.audience || brand.audience;
  scenes.push(
    sceneSchema.parse({
      id: sceneId(),
      durationSec: timing.problem,
      narration: en
        ? `For ${audience || "busy teams"}, finding the right choice takes too much time. It shouldn't.`
        : clampNarration(
            audience
              ? `${audience}的日常裡，想找到一個真正合適的選擇，往往比想像中費力。`
              : `想找到一個真正合適的選擇，往往比想像中費力。`,
            timing.problem,
          ),
      title: en ? "The problem" : "你遇到的情境",
      subtitle: en ? "" : OBJECTIVE_ANGLES[project.objective] ?? "",
      assetId: pickAsset(assets, assetCursor++),
      assetMode: "blur-bg",
      animation: "fade",
      transition: "fade",
      backgroundColor: brand.secondaryColor,
      needsConfirmation: !audience,
    }),
  );

  // 3) 產品與主要價值（每個賣點一場）
  const effectivePoints = points.length > 0 ? points.slice(0, valueCount) : [];
  for (let i = 0; i < valueCount; i++) {
    const point = effectivePoints[i];
    scenes.push(
      sceneSchema.parse({
        id: sceneId(),
        durationSec: timing.values[i],
        narration: point
          ? en
            ? `${point}.`
            : clampNarration(
                `${point}${[
                  `——這是${project.productName}最被在意的理由。`,
                  "——不是口號，是用得到的差別。",
                  "——日常使用就感受得到。",
                ][i % 3]}`,
                timing.values[i],
              )
          : en
            ? `A key benefit of ${project.productName}. (Please confirm the actual selling point.)`
            : clampNarration(`${project.productName}的核心價值之一，待你補上具體說明。`, timing.values[i]),
        title: point ?? (en ? `Benefit ${i + 1}` : `賣點 ${i + 1}（待確認）`),
        subtitle: en ? `0${i + 1}` : `第 ${i + 1} 點`,
        assetId: pickAsset(assets, assetCursor++),
        assetMode: i % 2 === 0 ? "split" : "center",
        animation: i % 2 === 0 ? "slide-left" : "rise",
        transition: "slide",
        backgroundColor: i % 2 === 0 ? brand.secondaryColor : brand.primaryColor,
        needsConfirmation: !point,
      }),
    );
  }

  // 4) 案例／使用場景（不捏造數據與證言，用中性場景描述）
  const proofNarrations = en
    ? [
        `Where it fits: ${project.productDescription || project.productName}.`,
        `Designed for real, everyday use.`,
      ]
    : [
        clampNarration(
          project.productDescription
            ? `${project.productDescription}`
            : `實際使用的樣子，比任何形容都有說服力。`,
          timing.proof[0],
        ),
        `放進真實的場景裡，你會知道它合不合適。`,
      ];
  timing.proof.forEach((d, i) => {
    scenes.push(
      sceneSchema.parse({
        id: sceneId(),
        durationSec: d,
        narration: clampNarration(proofNarrations[i] ?? proofNarrations[0], d),
        title: en ? "In real life" : "真實使用場景",
        subtitle: thin && !en ? "（建議補充實際案例）" : "",
        assetId: pickAsset(assets, assetCursor++),
        assetMode: "cover",
        animation: "fade",
        transition: "fade",
        backgroundColor: brand.primaryColor,
        needsConfirmation: thin,
      }),
    );
  });

  // 5) CTA
  const cta = project.cta || brand.defaultCta;
  scenes.push(
    sceneSchema.parse({
      id: sceneId(),
      durationSec: timing.cta,
      narration: en
        ? `${cta || `Learn more about ${project.productName}`}. ${brand.name}.`
        : clampNarration(`${tone.closing}${cta ? `${cta}。` : ""}`, timing.cta),
      title: cta || (en ? "Learn more" : `${tone.ctaVerb}更多`),
      subtitle: brand.name,
      assetId: null,
      assetMode: "center",
      animation: "rise",
      transition: "fade",
      backgroundColor: brand.primaryColor,
      needsConfirmation: !cta,
    }),
  );

  return scenes;
}

const SHORT_ANGLES = [
  {
    key: "value",
    title: (p: string) => `${p}｜30 秒看懂`,
    hook: (input: StrategyInput) =>
      `只講一件事：${input.project.sellingPoints[0] ?? input.project.productName}。`,
    body: (input: StrategyInput) =>
      `${input.project.productName}把這件事做到位——${(input.project.sellingPoints[0] ?? "核心價值")}，不是口號，是日常用得到的差別。`,
  },
  {
    key: "pain",
    title: (p: string) => `還在將就嗎？${p}`,
    hook: (input: StrategyInput) =>
      `${input.project.audience || input.brand.audience || "你"}最常遇到的困擾，其實有解。`,
    body: (input: StrategyInput) =>
      `與其繼續將就，不如看看${input.project.productName}怎麼把${(input.project.sellingPoints[1] ?? input.project.sellingPoints[0] ?? "這件事")}變簡單。`,
  },
  {
    key: "scene",
    title: (p: string) => `一天裡的${p}`,
    hook: (input: StrategyInput) => `想像一下：${input.project.productName}出現在你的一天。`,
    body: (input: StrategyInput) =>
      `${input.project.productDescription ? input.project.productDescription.slice(0, 60) : `從早到晚，${input.project.productName}都派得上用場`}。`,
  },
  {
    key: "gift",
    title: (p: string) => `${p}，送禮的好答案`,
    hook: (input: StrategyInput) => `挑禮物很難？${input.project.productName}是安全牌裡的驚喜。`,
    body: (input: StrategyInput) =>
      `${(input.project.sellingPoints[2] ?? input.project.sellingPoints[0] ?? "質感與心意")}，收到的人會記得。`,
  },
  {
    key: "qa",
    title: (p: string) => `三個問題認識${p}`,
    hook: (input: StrategyInput) => `三個問題，快速認識${input.project.productName}。`,
    body: (input: StrategyInput) =>
      `是什麼？${input.project.productName}。特別在哪？${(input.project.sellingPoints[0] ?? "待補充")}。適合誰？${input.project.audience || input.brand.audience || "在找它的你"}。`,
  },
];

function buildShorts(input: StrategyInput): ShortScript[] {
  const { brand, project, assets } = input;
  const count = Math.min(5, Math.max(3, project.shortVideoCount));
  const cta = project.cta || brand.defaultCta || `認識 ${project.productName}`;
  const en = project.language === "en";

  return SHORT_ANGLES.slice(0, count).map((angle, i) => {
    const durationSec = 20;
    const hook = en ? `${project.productName}: one thing you should know.` : angle.hook(input);
    const body = en
      ? `${project.sellingPoints[i % Math.max(1, project.sellingPoints.length)] ?? project.productDescription ?? project.productName}.`
      : angle.body(input);
    const scenes: Scene[] = [
      sceneSchema.parse({
        id: sceneId(),
        durationSec: 5,
        narration: clampNarration(hook, 5),
        title: project.productName,
        subtitle: brand.name,
        assetId: pickAsset(assets, i),
        assetMode: "cover",
        animation: "zoom",
        transition: "cut",
        backgroundColor: brand.primaryColor,
      }),
      sceneSchema.parse({
        id: sceneId(),
        durationSec: 10,
        narration: clampNarration(body, 10),
        title: en ? "Why it matters" : "為什麼值得",
        subtitle: "",
        assetId: pickAsset(assets, i + 1),
        assetMode: "blur-bg",
        animation: "rise",
        transition: "fade",
        backgroundColor: brand.secondaryColor,
      }),
      sceneSchema.parse({
        id: sceneId(),
        durationSec: 5,
        narration: clampNarration(en ? `${cta}.` : `${cta}。`, 5),
        title: cta,
        subtitle: brand.name,
        assetId: null,
        assetMode: "center",
        animation: "fade",
        transition: "fade",
        backgroundColor: brand.primaryColor,
      }),
    ];
    return {
      title: en ? `${project.productName} · Short ${i + 1}` : angle.title(project.productName),
      hook,
      body,
      cta,
      durationSec,
      scenes,
    };
  });
}

function buildSocialCopy(input: SocialCopyInput): SocialCopy {
  const { brand, project, masterTitle } = input;
  const points = project.sellingPoints.filter((p) => p.trim());
  const cta = project.cta || brand.defaultCta;
  const tagBase = [
    brand.name,
    project.productName,
    ...(brand.industry ? [brand.industry] : []),
  ]
    .map((t) => t.replace(/\s+/g, ""))
    .filter(Boolean);
  const hashtags = Array.from(
    new Set([...tagBase, "台灣品牌", "新品上市", "生活提案"]),
  ).slice(0, 8);
  const pointLines = points.map((p) => `・${p}`).join("\n");

  return socialCopySchema.parse({
    youtubeTitle: masterTitle,
    youtubeDescription: `${project.productDescription || project.productName}\n\n${pointLines}\n\n${cta ? `👉 ${cta}` : ""}\n\n${brand.name}`.trim(),
    instagram: `${masterTitle}\n\n${points[0] ? `${points[0]}。` : ""}${points[1] ? `${points[1]}。` : ""}\n${cta ? `${cta} — 連結在個人檔案。` : ""}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`.trim(),
    facebook: `【${masterTitle}】\n\n${project.productDescription || project.productName}\n\n${pointLines}\n\n${cta ? `➤ ${cta}` : ""}`.trim(),
    tiktok: `${points[0] ?? masterTitle}，${points[1] ?? "看完你就懂"} ${hashtags.slice(0, 4).map((h) => `#${h}`).join(" ")}`,
    hashtags,
    thumbnailTitles: [
      project.productName.slice(0, 12),
      points[0] ? points[0].slice(0, 12) : `為什麼選${brand.name}`.slice(0, 12),
      cta ? cta.slice(0, 12) : "現在就了解",
    ],
  });
}

const SENSITIVE_INDUSTRY = /(醫療|醫美|診所|藥|保健|金融|投資|理財|貸款|保險|法律|律師)/;

export class MockContentAIProvider implements ContentAIProvider {
  readonly name = "mock";

  private async simulateLatency() {
    if (process.env.NODE_ENV === "test" || process.env.MOCK_FAST === "1") return;
    await new Promise((r) => setTimeout(r, 700));
  }

  async generateStrategy(input: StrategyInput): Promise<ContentStrategy> {
    await this.simulateLatency();
    const { brand, project } = input;
    const en = project.language === "en";
    const points = project.sellingPoints.filter((p) => p.trim());
    const needsConfirmation: string[] = [];
    if (points.length === 0) needsConfirmation.push("尚未提供主要賣點，賣點場景為佔位內容");
    if (project.productDescription.trim().length < 20)
      needsConfirmation.push("產品介紹偏短，案例場景使用中性描述，建議補充實際案例");
    if (!(project.cta || brand.defaultCta)) needsConfirmation.push("尚未設定 CTA");
    if (!(project.audience || brand.audience)) needsConfirmation.push("尚未設定目標受眾");

    const sensitive =
      SENSITIVE_INDUSTRY.test(brand.industry) ||
      SENSITIVE_INDUSTRY.test(project.productDescription);

    const masterTitle = en
      ? `${project.productName} — ${brand.name}`
      : `${project.productName}｜${OBJECTIVE_ANGLES[project.objective] ?? "品牌介紹"}`;

    const strategy: ContentStrategy = {
      strategyOneLiner: en
        ? `Make ${project.productName} the obvious choice for ${project.audience || "its audience"} in under ${project.masterDuration} seconds.`
        : `用 ${project.masterDuration} 秒，讓${project.audience || brand.audience || "目標受眾"}記住${project.productName}最值得選的理由。`,
      painPoints:
        (project.audience || brand.audience)
          ? [
              `${project.audience || brand.audience}沒時間慢慢研究，需要一眼看懂的理由`,
              "選擇太多、資訊太雜，難以判斷哪個真正適合",
            ]
          : ["受眾輪廓待確認，先以通用痛點推進"],
      coreMessages: points.length > 0 ? points.slice(0, 3) : [`${project.productName}的核心價值（待補充）`],
      master: {
        title: masterTitle,
        scenes: buildMasterScenes(input),
      },
      shorts: buildShorts(input),
      socialCopy: buildSocialCopy({ brand, project, masterTitle }),
      complianceNote: sensitive
        ? "此內容可能涉及醫療／金融／法律等受規範領域，發布前請務必經人工與法遵審核。"
        : null,
      needsConfirmation,
    };
    return contentStrategySchema.parse(strategy);
  }

  async regenerateScene(input: RegenerateSceneInput): Promise<Scene> {
    await this.simulateLatency();
    const { scene, project, brand } = input;
    const variants = [
      (t: string) => `換個說法：${t}`,
      (t: string) => `${t}——這一點，${project.audience || brand.audience || "很多人"}最有感。`,
      (t: string) => `直接說重點。${t}`,
    ];
    const base = scene.narration.replace(/^換個說法：|^直接說重點。/, "");
    const pick = variants[(base.length + input.sceneIndex) % variants.length];
    return sceneSchema.parse({
      ...scene,
      narration: clampNarration(pick(base), scene.durationSec),
    });
  }

  async generateSocialCopy(input: SocialCopyInput): Promise<SocialCopy> {
    await this.simulateLatency();
    return buildSocialCopy(input);
  }
}
