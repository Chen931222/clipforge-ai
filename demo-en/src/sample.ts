/**
 * 首屏預設稿。訪客一進來就看到一份「已經打樣完成」的成品，
 * 而不是空表格——先看懂機制，再把原稿換成自己的。
 * 用的品牌與產品頁 landing 的示範一致（Northline Coffee），
 * 兩個表面看起來才像同一家公司。
 */
export interface Brief {
  brandName: string;
  productName: string;
  productDescription: string;
  sellingPoints: string[];
  cta: string;
  audience: string;
  style: string;
  masterDuration: number;
  accent: string;
}

export const SAMPLE_BRIEF: Brief = {
  brandName: "Northline Coffee",
  productName: "Cold Brew Gift Box",
  productDescription:
    "A gift box of single-origin cold brew concentrate, steeped for 18 hours and bottled without sugar or syrup. Keeps in the fridge for two weeks and pours over ice in seconds, so an office or a household gets café coffee without a barista.",
  sellingPoints: [
    "Single-origin beans from one farm",
    "Steeped cold for 18 hours, never bitter",
    "No sugar, no syrup, nothing else",
    "Ready in the fridge, poured in seconds",
  ],
  cta: "Order a sample box",
  audience: "Office managers and home hosts who care about what they serve",
  style: "warm",
  masterDuration: 60,
  accent: "#1F3D2B",
};

export const STYLE_OPTIONS = [
  { value: "professional", label: "Professional" },
  { value: "tech", label: "Tech" },
  { value: "warm", label: "Warm" },
  { value: "playful", label: "Playful" },
  { value: "premium", label: "Premium" },
  { value: "minimal", label: "Minimal" },
];

export const DURATION_OPTIONS = [60, 90, 120];
