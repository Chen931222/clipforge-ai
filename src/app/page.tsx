import Link from "next/link";

/*
DIRECTION CONTRACT
THESIS：把「AI 生影片」翻回它的紙本真身——一張填好的 cue sheet 就是產品；
拒絕本類別預設的黑底霓虹 AI 工具 hero。
OWN-WORLD：紙白 #F7F5F0、墨 #1C1A15、單一 REC 紅 #C8321E、髮絲線表格、
明體襯線 display、mono timecode。移除所有文字仍認得出是製片紙本作業系統。
STORY：訪客（沒有影音團隊的行銷人）看到自己的產品可以變成一張被填好的
場記表，再派生出主影片、短影音與貼文 → 相信 10 分鐘可完成 → 按「免費製作 Demo」。
FIRST VIEWPORT：左 5/12 欄襯線大標＋兩顆 CTA；右 7/12 一張真實內容的
cue sheet（森日茶研 demo 的實際腳本），右上角 REC 章呼吸；主要動作＝紅色實底「免費製作 Demo」。
FORM：grounded #6（錄音室／製片紙本系統），concept-seed key ca14682d；
staging＝artifact-led hero（挑戰者未勝出）。
*/

const CUE_ROWS = [
  { no: "S01", tc: "00:00–00:05", visual: "禮盒主視覺・滿版", vo: "有些好東西，值得慢慢認識——冷泡烏龍茶禮盒。" },
  { no: "S02", tc: "00:05–00:19", visual: "生活情境・模糊背景", vo: "重視質感與健康的上班族，想找到真正合適的選擇，往往比想像中費力。" },
  { no: "S03", tc: "00:19–00:34", visual: "高山茶園・左右分割", vo: "台灣高山茶葉——這是冷泡烏龍茶禮盒最被在意的理由之一。" },
  { no: "S04", tc: "00:34–00:49", visual: "冷泡瓶特寫・置中", vo: "低溫冷泡、甘甜不澀——喝得出來的差別。" },
  { no: "S05", tc: "00:49–01:03", visual: "無糖標示・左右分割", vo: "無糖零負擔，日常也能講究。" },
];

const STEPS = [
  { n: "01", title: "上傳品牌與產品素材", body: "品牌色、Logo、產品圖與一段介紹文字，就是全部需要的輸入。" },
  { n: "02", title: "AI 生成內容企劃", body: "策略、主影片場景腳本、短影音腳本、字幕與各平台文案，一次生成、全部可改。" },
  { n: "03", title: "匯出各平台影片與文案", body: "MP4（16:9 與 9:16）、SRT 字幕、Markdown 腳本與社群貼文，直接可用。" },
];

const OUTPUTS = [
  { k: "主影片", v: "90 秒・16:9・1080p", d: "Hook → 情境 → 三大賣點 → 場景 → CTA" },
  { k: "短影音", v: "3 支・20 秒・9:16", d: "每支獨立 Hook 與 CTA，不是剪長片" },
  { k: "社群文案", v: "YT / IG / FB / TikTok", d: "含 Hashtag 與三組縮圖標題" },
  { k: "字幕", v: "SRT・三種樣式", d: "時間碼由場景秒數自動對位" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-xl font-bold">ClipForge</span>
          <span className="font-mono text-xs tracking-widest text-rec">AI</span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-ink-60 hover:text-ink hover:underline underline-offset-4">
            登入
          </Link>
          <Link
            href="/register"
            className="rounded-[4px] border border-ink px-3 py-1.5 hover:bg-sheet"
          >
            註冊
          </Link>
        </nav>
      </header>

      {/* 第一屏：cue sheet 為主角 */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-12 lg:pt-16">
        <div className="lg:col-span-5">
          <p className="font-mono text-xs tracking-[0.2em] text-ink-40">
            AI CONTENT PRODUCTION SHEET
          </p>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.2] sm:text-5xl">
            一份素材，完成主影片、短影音與整月社群內容。
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-ink-60">
            上傳產品資料，AI 幫你完成企劃、腳本、配音、字幕與影片輸出。
            場記表就是你的內容資產——改一格，全部輸出跟著更新。
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className="rounded-[4px] bg-rec px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rec-dark"
            >
              免費製作 Demo
            </Link>
            <a
              href="#sample"
              className="rounded-[4px] border border-ink px-5 py-2.5 text-sm font-medium hover:bg-sheet"
            >
              查看範例
            </a>
          </div>
          <p className="mt-4 font-mono text-xs text-ink-40">
            不需登入・不需金鑰・10 分鐘跑完全流程
          </p>
        </div>

        <div className="lg:col-span-7">
          {/* 疊紙雙框：抬起的紙用第二層紙表現，不用陰影（DESIGN.md） */}
          <div className="relative">
            <div
              aria-hidden
              className="absolute inset-0 translate-x-2 translate-y-2 rounded-md border border-rule bg-sheet"
            />
            <div className="relative rounded-md border border-ink bg-sheet">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink px-5 py-3">
              <div>
                <div className="font-mono text-[11px] tracking-[0.18em] text-ink-40">CUE SHEET</div>
                <div className="font-serif text-lg font-semibold">森日茶研・冷泡烏龍茶禮盒</div>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-rec px-3 py-1 font-mono text-xs text-rec">
                <span className="rec-dot h-2 w-2 rounded-full bg-rec" />
                生成中 S06／08
              </div>
            </div>
            <div className="overflow-x-auto px-2 py-1">
              <table className="cue-table min-w-[520px]">
                <thead>
                  <tr>
                    <th>NO.</th>
                    <th>TIMECODE</th>
                    <th>畫面</th>
                    <th>旁白</th>
                  </tr>
                </thead>
                <tbody>
                  {CUE_ROWS.map((row) => (
                    <tr key={row.no}>
                      <td className="font-mono text-xs text-ink-40">{row.no}</td>
                      <td className="font-mono text-xs">{row.tc}</td>
                      <td className="text-xs text-ink-60">{row.visual}</td>
                      <td className="text-sm">{row.vo}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} className="py-2 text-center font-mono text-xs text-ink-40">
                      … S06–S08：使用場景 × 2、CTA 填寫中
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-rule px-5 py-3">
              {["主影片 90s", "短影音 ×3", "IG／FB／YT 文案", "SRT 字幕"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-rule px-2.5 py-0.5 font-mono text-[11px] text-ink-60"
                >
                  {chip}
                </span>
              ))}
              <span className="ms-auto font-mono text-[10px] tracking-[0.14em] text-ink-40">
                CF-01 · PAGE 1/1
              </span>
            </div>
            </div>
          </div>
          <p className="mt-2 text-right font-mono text-[11px] text-ink-40">
            範例內容由 Demo 專案實際生成
          </p>
        </div>
      </section>

      {/* 三步驟 */}
      <section className="border-y border-rule bg-sheet">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.n} className="flex gap-4">
              <div className="font-mono text-sm text-rec">{step.n}</div>
              <div>
                <h2 className="font-serif text-lg font-semibold">{step.title}</h2>
                <p className="mt-2 text-sm leading-6 text-ink-60">{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 一份企劃 → 全部輸出 */}
      <section id="sample" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-serif text-3xl font-semibold">
          同一張場記表，派生所有格式。
        </h2>
        <p className="mt-3 max-w-xl text-ink-60">
          不是「AI 生一支影片」，而是把企劃固化成結構化場景資料——主影片、直式短影音、
          貼文與字幕都從同一份資料派生，品牌語氣與 CTA 永遠一致。
        </p>
        <div className="mt-10 overflow-x-auto">
          <table className="cue-table min-w-[640px]">
            <thead>
              <tr>
                <th>輸出</th>
                <th>規格</th>
                <th>內容</th>
              </tr>
            </thead>
            <tbody>
              {OUTPUTS.map((o) => (
                <tr key={o.k}>
                  <td className="font-serif text-base font-semibold">{o.k}</td>
                  <td className="font-mono text-xs">{o.v}</td>
                  <td className="text-sm text-ink-60">{o.d}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 rounded-md border border-rule bg-sheet p-5">
          <div className="font-mono text-[11px] tracking-[0.18em] text-ink-40">
            INSTAGRAM · 由同一份企劃生成
          </div>
          <p className="mt-3 text-sm leading-6">
            冷泡烏龍茶禮盒｜把主打賣點講成一個好懂的故事
            <br />
            台灣高山茶葉。低溫冷泡、甘甜不澀。立即預購企業送禮方案 — 連結在個人檔案。
            <br />
            <span className="text-ink-40">#森日茶研 #冷泡烏龍茶禮盒 #台灣品牌 #新品上市</span>
          </p>
        </div>
      </section>

      {/* 收尾 */}
      <section className="bg-well text-paper">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-snug">
            沒有影音團隊，也能有影音團隊的產出節奏。
          </h2>
          <Link
            href="/demo"
            className="rounded-[4px] bg-rec px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-rec-dark"
          >
            免費製作 Demo
          </Link>
        </div>
      </section>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 font-mono text-xs text-ink-40 sm:px-6">
        <span>ClipForge AI — MVP</span>
        <span>渲染由 Remotion 完成・無金鑰時以 Mock Provider 運作</span>
      </footer>
    </div>
  );
}
