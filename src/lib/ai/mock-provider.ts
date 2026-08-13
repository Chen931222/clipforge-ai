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

/** 使用者輸入放在英文句首時要大寫。 */
function enCapitalize(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** 英文輸入嵌進句子中間時，先去掉尾端標點，避免出現句中句號。 */
function enFragment(text: string): string {
  return text.trim().replace(/[\s.,;:!?–—-]+$/, "");
}

/** 英文句尾補標點；已經有結束標點就不重複加。 */
function enSentence(text: string): string {
  const body = text.trim().replace(/[\s,;:–—-]+$/, "");
  if (!body) return body;
  // 收尾的引號、括號本身不算結束標點，要看它前面那個字元
  const tail = body.replace(/["')\]]+$/, "");
  return /[.!?]$/.test(tail) ? body : `${body}.`;
}

/** 裁切後若剛好停在冠詞、介系詞、代名詞上，再往回退一個字，句子才收得乾淨。 */
const EN_DANGLING_WORD =
  /\s+(a|an|the|and|or|but|of|to|in|on|at|for|with|from|by|so|as|than|that|is|are|was|were|be|been|it|its|we|you|your|our|they|their|this|these|those)$/i;

/** 回傳最後一個「標點＋空白」的標點索引；找不到回 -1。用來把英文切在句子或子句邊界。 */
function lastBoundaryIndex(text: string, marks: string): number {
  let last = -1;
  for (let i = 0; i < text.length - 1; i++) {
    if (marks.includes(text[i]) && /\s/.test(text[i + 1])) last = i;
  }
  return last;
}

/** 英文裁切：優先切在句子／子句邊界，再退到單字邊界，絕不把單字切一半。 */
function clampWordsEn(text: string, maxChars: number): string {
  const source = text.trim();
  if (source.length <= maxChars) return source;
  const floor = Math.floor(maxChars * 0.4);
  // 多取一個字元，讓剛好卡在預算上的完整單字也能保留
  const head = source.slice(0, maxChars + 1);
  // 切在句子邊界最理想；句號後面要接空白才算，才不會切在 "2.5" 的小數點上
  const sentence = lastBoundaryIndex(head, ".!?");
  if (sentence >= floor) return head.slice(0, sentence + 1);
  // 其次切在子句邊界，讀起來仍收得成一句話
  const clause = lastBoundaryIndex(head, ",;:");
  const space = head.lastIndexOf(" ");
  const cut = clause >= floor ? clause : space >= floor ? space : maxChars;
  let body = head.slice(0, cut).replace(/[\s,;:.–—-]+$/, "");
  while (body.length > floor && EN_DANGLING_WORD.test(body)) {
    body = body.replace(EN_DANGLING_WORD, "");
  }
  return body;
}

function clampNarration(text: string, durationSec: number, en = false): string {
  if (en) {
    // 英文口語約每秒 2.3 個單字，單字平均 5.5 字元再加一個空格。
    const budget = Math.max(24, Math.round(durationSec * 2.3 * 6.5));
    return enCapitalize(enSentence(clampWordsEn(text, budget)));
  }
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
        ? clampNarration(`Meet ${project.productName} — by ${brand.name}.`, timing.hook, true)
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
        ? clampNarration(
            `For ${audience || "busy teams"}, finding the right choice takes too much time. It shouldn't.`,
            timing.problem,
            true,
          )
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
            ? clampNarration(point, timing.values[i], true)
            : clampNarration(
                `${point}${[
                  `——這是${project.productName}最被在意的理由。`,
                  "——不是口號，是用得到的差別。",
                  "——日常使用就感受得到。",
                ][i % 3]}`,
                timing.values[i],
              )
          : en
            ? clampNarration(
                `One of the reasons to choose ${project.productName}. Add the real selling point here.`,
                timing.values[i],
                true,
              )
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
        `Where it fits: ${project.productDescription || project.productName}`,
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
        narration: clampNarration(proofNarrations[i] ?? proofNarrations[0], d, en),
        title: en ? "In real life" : "真實使用場景",
        subtitle: thin ? (en ? "(Add a real example)" : "（建議補充實際案例）") : "",
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
        ? clampNarration(
            `${enSentence(cta || `Learn more about ${project.productName}`)} ${brand.name}`,
            timing.cta,
            true,
          )
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
    enTitle: (p: string) => `${p} in 30 seconds`,
    enHook: (input: StrategyInput) =>
      enSentence(`Just one thing: ${input.project.sellingPoints[0] ?? input.project.productName}`),
    enBody: (input: StrategyInput) =>
      `${input.project.productName} does one thing well: ${enSentence(input.project.sellingPoints[0] ?? "the core benefit")} Not a slogan, a difference you notice in daily use.`,
  },
  {
    key: "pain",
    title: (p: string) => `還在將就嗎？${p}`,
    hook: (input: StrategyInput) =>
      `${input.project.audience || input.brand.audience || "你"}最常遇到的困擾，其實有解。`,
    body: (input: StrategyInput) =>
      `與其繼續將就，不如看看${input.project.productName}怎麼把${(input.project.sellingPoints[1] ?? input.project.sellingPoints[0] ?? "這件事")}變簡單。`,
    enTitle: (p: string) => `Still settling for less? ${p}`,
    enHook: (input: StrategyInput) =>
      `The thing ${input.project.audience || input.brand.audience || "you"} run into most has a fix.`,
    enBody: (input: StrategyInput) =>
      // 賣點是使用者填的片語，接在冒號後面才不會被硬塞進句子中間變成病句
      `Instead of settling, see what ${input.project.productName} does differently: ${enSentence(input.project.sellingPoints[1] ?? input.project.sellingPoints[0] ?? "the part that matters most")}`,
  },
  {
    key: "scene",
    title: (p: string) => `一天裡的${p}`,
    hook: (input: StrategyInput) => `想像一下：${input.project.productName}出現在你的一天。`,
    body: (input: StrategyInput) =>
      `${input.project.productDescription ? input.project.productDescription.slice(0, 60) : `從早到晚，${input.project.productName}都派得上用場`}。`,
    enTitle: (p: string) => `${p} in your day`,
    enHook: (input: StrategyInput) => `Picture it: ${input.project.productName} in your day.`,
    enBody: (input: StrategyInput) =>
      enSentence(
        input.project.productDescription
          ? clampWordsEn(input.project.productDescription, 120)
          : `From morning to night, ${input.project.productName} earns its place`,
      ),
  },
  {
    key: "gift",
    title: (p: string) => `${p}，送禮的好答案`,
    hook: (input: StrategyInput) => `挑禮物很難？${input.project.productName}是安全牌裡的驚喜。`,
    body: (input: StrategyInput) =>
      `${(input.project.sellingPoints[2] ?? input.project.sellingPoints[0] ?? "質感與心意")}，收到的人會記得。`,
    enTitle: (p: string) => `${p} makes an easy gift`,
    enHook: (input: StrategyInput) =>
      `Gifts are hard. ${input.project.productName} is the safe pick that still surprises.`,
    enBody: (input: StrategyInput) =>
      `${enCapitalize(enSentence(input.project.sellingPoints[2] ?? input.project.sellingPoints[0] ?? "Quality you can feel"))} That is what people remember.`,
  },
  {
    key: "qa",
    title: (p: string) => `三個問題認識${p}`,
    hook: (input: StrategyInput) => `三個問題，快速認識${input.project.productName}。`,
    body: (input: StrategyInput) =>
      `是什麼？${input.project.productName}。特別在哪？${(input.project.sellingPoints[0] ?? "待補充")}。適合誰？${input.project.audience || input.brand.audience || "在找它的你"}。`,
    enTitle: (p: string) => `Three questions about ${p}`,
    enHook: (input: StrategyInput) =>
      `Three questions, and you will know ${input.project.productName}.`,
    enBody: (input: StrategyInput) =>
      `What is it? ${enSentence(input.project.productName)} What stands out? ${enCapitalize(enSentence(input.project.sellingPoints[0] ?? "To be confirmed"))} Who is it for? ${enCapitalize(enSentence(input.project.audience || input.brand.audience || "Anyone still looking"))}`,
  },
];

function buildShorts(input: StrategyInput): ShortScript[] {
  const { brand, project, assets } = input;
  const count = Math.min(5, Math.max(3, project.shortVideoCount));
  const en = project.language === "en";
  const cta =
    project.cta ||
    brand.defaultCta ||
    (en
      ? clampWordsEn(`Learn more about ${project.productName}`, 60)
      : `認識 ${project.productName}`);

  return SHORT_ANGLES.slice(0, count).map((angle, i) => {
    const durationSec = 20;
    // 英文句型比中文長，產品名或受眾一長就會撞到 schema 上限，先照欄位長度收乾淨
    const hook = en ? enSentence(clampWordsEn(angle.enHook(input), 119)) : angle.hook(input);
    const body = en ? enSentence(clampWordsEn(angle.enBody(input), 299)) : angle.body(input);
    const scenes: Scene[] = [
      sceneSchema.parse({
        id: sceneId(),
        durationSec: 5,
        narration: clampNarration(hook, 5, en),
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
        narration: clampNarration(body, 10, en),
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
        narration: clampNarration(en ? cta : `${cta}。`, 5, en),
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
      title: en
        ? clampWordsEn(angle.enTitle(project.productName), 60)
        : angle.title(project.productName),
      hook,
      body,
      cta,
      durationSec,
      scenes,
    };
  });
}

/** 英文 hashtag：把品牌／產品／賣點本身轉成駝峰標籤，不套固定清單。 */
function enHashtag(text: string): string {
  return text
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((w) => `${w.charAt(0).toUpperCase()}${w.slice(1)}`)
    .join("");
}

/** 產品資訊太少、湊不滿 schema 要求的 3 個 hashtag 時，用專案目標補位。 */
const EN_OBJECTIVE_TAGS: Record<string, string> = {
  expo: "TradeShow",
  promotion: "NewRelease",
  branding: "BrandStory",
  conversion: "ShopNow",
  education: "HowItWorks",
};

function buildSocialCopyEn(input: SocialCopyInput): SocialCopy {
  const { brand, project, masterTitle } = input;
  const points = project.sellingPoints.filter((p) => p.trim());
  const cta = project.cta || brand.defaultCta;
  const description = project.productDescription || project.productName;
  const hashtags = Array.from(
    new Set(
      [
        brand.name,
        project.productName,
        brand.industry,
        ...points.slice(0, 3),
        project.audience || brand.audience,
      ]
        .map(enHashtag)
        .filter(Boolean),
    ),
  ).slice(0, 8);
  for (const fallback of [
    EN_OBJECTIVE_TAGS[project.objective] ?? "NewRelease",
    "ProductVideo",
    "HowItWorks",
  ]) {
    if (hashtags.length >= 3) break;
    if (!hashtags.includes(fallback)) hashtags.push(fallback);
  }
  const pointLines = points.map((p) => `- ${enCapitalize(enFragment(p))}`).join("\n");
  const leadPoints = points.slice(0, 2).map((p) => enCapitalize(enSentence(p))).join(" ");
  const ctaLine = cta ? enCapitalize(enSentence(cta)) : "";

  return socialCopySchema.parse({
    youtubeTitle: masterTitle,
    youtubeDescription: `${enCapitalize(enSentence(description))}\n\n${pointLines}\n\n${ctaLine}\n\n${brand.name}`.trim(),
    instagram: `${masterTitle}\n\n${leadPoints}\n${ctaLine ? `${ctaLine} Link in bio.` : ""}\n\n${hashtags.map((h) => `#${h}`).join(" ")}`.trim(),
    facebook: `${masterTitle}\n\n${enCapitalize(enSentence(description))}\n\n${pointLines}\n\n${ctaLine}`.trim(),
    tiktok: `${enCapitalize(enSentence(points[0] ?? masterTitle))} ${points[1] ? enCapitalize(enSentence(points[1])) : "Here is the short version."} ${hashtags.slice(0, 4).map((h) => `#${h}`).join(" ")}`,
    hashtags,
    // 縮圖標題以 schema 上限 30 字元為單字預算，不沿用中文的 12 字預算
    thumbnailTitles: [
      enCapitalize(clampWordsEn(project.productName, 30)),
      points[0] ? enCapitalize(clampWordsEn(points[0], 30)) : clampWordsEn(`Why ${brand.name}`, 30),
      cta ? enCapitalize(clampWordsEn(cta, 30)) : "Learn more",
    ],
  });
}

function buildSocialCopy(input: SocialCopyInput): SocialCopy {
  const { brand, project, masterTitle } = input;
  if (project.language === "en") return buildSocialCopyEn(input);
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
/** 英文專案同樣要觸發合規提醒；比對字根並忽略大小寫。 */
const SENSITIVE_INDUSTRY_EN =
  /\b(medical|medicine|clinic|clinical|dental|dentist|doctor|patient|therapy|therapeutic|treatment|diagnos\w*|pharma\w*|drug|drugs|supplement|supplements|wellness|healthcare|financial|finance|investment|investing|investor|investors|trading|loan|loans|lending|mortgage|insurance|banking|crypto\w*|legal|lawyer|attorney|law firm|tax)\b/i;

function isSensitiveText(text: string): boolean {
  return SENSITIVE_INDUSTRY.test(text) || SENSITIVE_INDUSTRY_EN.test(text);
}

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
    if (points.length === 0)
      needsConfirmation.push(
        en
          ? "No selling points yet, so the benefit scenes are placeholders"
          : "尚未提供主要賣點，賣點場景為佔位內容",
      );
    if (project.productDescription.trim().length < 20)
      needsConfirmation.push(
        en
          ? "Product description is short, so the use-case scene stays generic. Add a real example"
          : "產品介紹偏短，案例場景使用中性描述，建議補充實際案例",
      );
    if (!(project.cta || brand.defaultCta))
      needsConfirmation.push(en ? "No CTA set" : "尚未設定 CTA");
    if (!(project.audience || brand.audience))
      needsConfirmation.push(en ? "No target audience set" : "尚未設定目標受眾");

    const sensitive =
      isSensitiveText(brand.industry) || isSensitiveText(project.productDescription);

    // 品牌名塞不進 80 字上限時整段拿掉，切一半的品牌名比沒有品牌名更難看
    const enMasterTitle = `${project.productName} — ${brand.name}`;
    const masterTitle = en
      ? enMasterTitle.length <= 80
        ? enMasterTitle
        : clampWordsEn(project.productName, 80)
      : `${project.productName}｜${OBJECTIVE_ANGLES[project.objective] ?? "品牌介紹"}`;

    const strategy: ContentStrategy = {
      strategyOneLiner: en
        ? enSentence(
            clampWordsEn(
              `Make ${project.productName} the obvious choice for ${project.audience || "its audience"} in under ${project.masterDuration} seconds.`,
              119,
            ),
          )
        : `用 ${project.masterDuration} 秒，讓${project.audience || brand.audience || "目標受眾"}記住${project.productName}最值得選的理由。`,
      painPoints:
        (project.audience || brand.audience)
          ? en
            ? [
                `${project.audience || brand.audience} will not spend long researching, so the reason to choose has to land at a glance`,
                "With too many options and too much noise, it is hard to tell what actually fits",
              ]
            : [
                `${project.audience || brand.audience}沒時間慢慢研究，需要一眼看懂的理由`,
                "選擇太多、資訊太雜，難以判斷哪個真正適合",
              ]
          : en
            ? ["Audience is not defined yet, so these pain points stay generic"]
            : ["受眾輪廓待確認，先以通用痛點推進"],
      coreMessages:
        points.length > 0
          ? points.slice(0, 3)
          : [
              en
                ? `Core value of ${project.productName} (to be confirmed)`
                : `${project.productName}的核心價值（待補充）`,
            ],
      master: {
        title: masterTitle,
        scenes: buildMasterScenes(input),
      },
      shorts: buildShorts(input),
      socialCopy: buildSocialCopy({ brand, project, masterTitle }),
      complianceNote: sensitive
        ? en
          ? "This content may touch a regulated area (medical, financial, or legal). Have a person review it for compliance before you publish."
          : "此內容可能涉及醫療／金融／法律等受規範領域，發布前請務必經人工與法遵審核。"
        : null,
      needsConfirmation,
    };
    return contentStrategySchema.parse(strategy);
  }

  async regenerateScene(input: RegenerateSceneInput): Promise<Scene> {
    await this.simulateLatency();
    const { scene, project, brand } = input;
    const en = project.language === "en";
    const variants = en
      ? [
          (t: string) => `Another way to put it: ${t}`,
          (t: string) =>
            `${enSentence(t)} That is the part ${project.audience || brand.audience || "most people"} notice first.`,
          (t: string) => `Straight to the point. ${t}`,
        ]
      : [
          (t: string) => `換個說法：${t}`,
          (t: string) => `${t}——這一點，${project.audience || brand.audience || "很多人"}最有感。`,
          (t: string) => `直接說重點。${t}`,
        ];
    const base = en
      ? scene.narration.replace(/^Another way to put it: |^Straight to the point\. /, "")
      : scene.narration.replace(/^換個說法：|^直接說重點。/, "");
    const pick = variants[(base.length + input.sceneIndex) % variants.length];
    return sceneSchema.parse({
      ...scene,
      narration: clampNarration(pick(base), scene.durationSec, en),
    });
  }

  async generateSocialCopy(input: SocialCopyInput): Promise<SocialCopy> {
    await this.simulateLatency();
    return buildSocialCopy(input);
  }
}
