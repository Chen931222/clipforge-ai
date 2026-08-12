import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth-crypto";
import { MockContentAIProvider } from "../src/lib/ai/mock-provider";

const db = new PrismaClient();

/**
 * Demo 資料（規格 §13）：森日茶研・冷泡烏龍茶禮盒。
 * 可重複執行：以 email upsert 使用者，demo 品牌與專案整組重建。
 */
async function main() {
  process.env.MOCK_FAST = "1";

  const demoUser = await db.user.upsert({
    where: { email: "demo@clipforge.local" },
    update: {},
    create: {
      email: "demo@clipforge.local",
      name: "Demo 使用者",
      passwordHash: await hashPassword("Demo1234!"),
      isDemo: true,
    },
  });

  // 重建 demo 品牌與專案（cascade 會清掉底下專案/影片/素材）
  await db.brand.deleteMany({ where: { userId: demoUser.id } });

  const brand = await db.brand.create({
    data: {
      userId: demoUser.id,
      name: "森日茶研",
      industry: "茶飲食品",
      description:
        "來自台灣的茶品牌，專注低溫冷泡工藝，把高山烏龍做成無糖、日常也講究的一瓶。",
      audience: "25–45 歲、重視質感與健康的上班族",
      tone: "溫暖、內斂、有質感",
      defaultCta: "立即預購企業送禮方案",
      primaryColor: "#35544A",
      secondaryColor: "#F4EFE6",
      textColor: "#FFFFFF",
      logoUrl: "/demo/logo.svg",
      websiteUrl: "https://example.com/senri-tea",
    },
  });

  const project = await db.project.create({
    data: {
      userId: demoUser.id,
      brandId: brand.id,
      name: "冷泡烏龍茶禮盒 上市企劃",
      productName: "冷泡烏龍茶禮盒",
      productDescription:
        "精選台灣高山茶葉，以低溫冷泡工藝帶出甘甜，無糖零負擔。禮盒設計沉穩大方，附企業訂製卡片，適合節慶與商務往來送禮。",
      objective: "promotion",
      audience: "25–45 歲、重視質感與健康的上班族",
      sellingPointsJson: JSON.stringify([
        "台灣高山茶葉",
        "低溫冷泡、甘甜不澀",
        "無糖零負擔",
        "禮盒質感設計",
        "企業送禮方案",
      ]),
      cta: "立即預購企業送禮方案",
      language: "zh-TW",
      style: "warm",
      masterDuration: 90,
      shortVideoCount: 3,
      status: "draft",
    },
  });

  const assetDefs = [
    { file: "tea-hero.svg", name: "禮盒主視覺.svg" },
    { file: "tea-bottle.svg", name: "冷泡瓶產品照.svg" },
    { file: "tea-leaf.svg", name: "高山茶園.svg" },
    { file: "tea-gift.svg", name: "企業送禮情境.svg" },
  ];
  const assets = [];
  for (const def of assetDefs) {
    assets.push(
      await db.asset.create({
        data: {
          projectId: project.id,
          type: "image",
          fileName: def.file,
          originalName: def.name,
          mimeType: "image/svg+xml",
          storageUrl: `/demo/${def.file}`,
          metadataJson: JSON.stringify({ demo: true, synthetic: true }),
        },
      }),
    );
  }

  // 用 Mock provider 預生成完整企劃（90 秒主影片 8 場景＋3 支短影音＋社群文案）
  const provider = new MockContentAIProvider();
  const strategy = await provider.generateStrategy({
    brand: {
      name: brand.name,
      industry: brand.industry,
      description: brand.description,
      audience: brand.audience,
      tone: brand.tone,
      defaultCta: brand.defaultCta,
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor,
      textColor: brand.textColor,
    },
    project: {
      name: project.name,
      productName: project.productName,
      productDescription: project.productDescription,
      objective: project.objective,
      audience: project.audience,
      sellingPoints: JSON.parse(project.sellingPointsJson) as string[],
      cta: project.cta,
      language: project.language,
      style: project.style,
      masterDuration: project.masterDuration,
      shortVideoCount: project.shortVideoCount,
    },
    assets: assets.map((a) => ({ id: a.id, type: a.type, originalName: a.originalName })),
  });

  await db.project.update({
    where: { id: project.id },
    data: { strategyJson: JSON.stringify(strategy), status: "scripted" },
  });

  const masterDuration = strategy.master.scenes.reduce((s, sc) => s + sc.durationSec, 0);
  await db.video.create({
    data: {
      projectId: project.id,
      type: "master",
      title: strategy.master.title,
      aspectRatio: "16:9",
      duration: masterDuration,
      scenesJson: JSON.stringify(strategy.master.scenes),
      socialCopyJson: JSON.stringify(strategy.socialCopy),
      status: "scripted",
    },
  });
  for (const short of strategy.shorts) {
    await db.video.create({
      data: {
        projectId: project.id,
        type: "short",
        title: short.title,
        aspectRatio: "9:16",
        duration: short.scenes.reduce((s, sc) => s + sc.durationSec, 0),
        scenesJson: JSON.stringify(short.scenes),
        socialCopyJson: JSON.stringify({ hook: short.hook, body: short.body, cta: short.cta }),
        status: "scripted",
      },
    });
  }

  console.log(
    `[seed] demo ready: brand=${brand.name} project=${project.name} scenes=${strategy.master.scenes.length} shorts=${strategy.shorts.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
