/**
 * 方向契約（打樣校對台 / press proof desk）
 *
 * THESIS — 這個表面擁有的一件事是「可追溯」：一段話進去，每一個輸出都指得回它。
 *   拒絕這個類別的預設版型（hero ＋ 功能格 ＋ CTA 的 SaaS demo 頁）。
 * OWN-WORLD — 紙白 #F7F5F0、墨 #1C1A15、唯一 REC 紅 #C8321E 當校稿紅筆；
 *   髮絲線分隔、無陰影；Noto Serif TC 做 display、Chivo Mono 只印度量與編號。
 * STORY — 訪客先看到一份已經打好的樣、看懂機制，把原稿換成自己的產品，
 *   看著樣重新排版，下載字幕與腳本，然後來信。
 * FIRST VIEWPORT — 同一張紙上的對開：左欄 COPY（可改的原稿），
 *   右欄 PROOF（影片畫布 ＋ cue sheet）。主要動作在左欄底部，紅色。
 * FORM — 打樣校對台，我排序清單的第 4 個；surface seed key 119338d5（降級骰，無挑戰者）。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player } from "@remotion/player";
import { MockContentAIProvider } from "../../src/lib/ai/mock-provider";
import { buildSubtitleCues, formatTimecode, toSrt } from "../../src/lib/srt";
import type { ContentStrategy, Scene } from "../../src/lib/ai/schemas";
import { FPS, SceneComposition, totalFrames, type VideoBrand } from "../../remotion/scenes";
import { DURATION_OPTIONS, SAMPLE_BRIEF, STYLE_OPTIONS, type Brief } from "./sample";

const provider = new MockContentAIProvider();
const GITHUB = "https://github.com/Chen931222/clipforge-ai";
const FREELANCER = "https://www.freelancer.com/u/yachengc";

interface Plate {
  id: string;
  name: string;
  url: string;
}

/** 表單 → provider 的兩個輸入物件（產品程式碼的既有介面，不改） */
function toProviderInput(brief: Brief, plates: Plate[]) {
  const brand = {
    name: brief.brandName.trim() || "Your brand",
    industry: "",
    description: brief.productDescription.trim(),
    audience: brief.audience.trim(),
    tone: "",
    defaultCta: brief.cta.trim(),
    primaryColor: brief.accent,
    secondaryColor: "#F7F5F0",
    textColor: "#FFFFFF",
  };
  const project = {
    name: `${brief.productName} launch`,
    productName: brief.productName.trim() || "Your product",
    productDescription: brief.productDescription.trim(),
    objective: "promotion",
    audience: brief.audience.trim(),
    sellingPoints: brief.sellingPoints.map((p) => p.trim()).filter(Boolean),
    cta: brief.cta.trim(),
    language: "en",
    style: brief.style,
    masterDuration: brief.masterDuration,
    shortVideoCount: 3,
  };
  const assets = plates.map((p) => ({ id: p.id, type: "image", originalName: p.name }));
  return { brand, project, assets };
}

/** 場景累積秒數 → mm:ss–mm:ss */
function timecodes(scenes: Scene[]): string[] {
  let at = 0;
  return scenes.map((s) => {
    const from = at;
    at += s.durationSec;
    return `${formatTimecode(from)}–${formatTimecode(at)}`;
  });
}

/** 追溯：這條賣點被寫進了哪幾個場景。mock 引擎會原句嵌入，所以子字串比對是可靠的。 */
function scenesForPoint(scenes: Scene[], point: string): Set<number> {
  const needle = point.trim().toLowerCase();
  const hit = new Set<number>();
  if (needle.length < 4) return hit;
  scenes.forEach((s, i) => {
    const hay = `${s.title} ${s.subtitle ?? ""} ${s.narration}`.toLowerCase();
    if (hay.includes(needle)) hit.add(i);
  });
  return hit;
}

function download(filename: string, body: string, mime: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Tab = "scenes" | "shorts" | "social" | "subtitles";
type Source = { kind: "master" } | { kind: "short"; index: number };

export function App() {
  const [brief, setBrief] = useState<Brief>(SAMPLE_BRIEF);
  const [plates, setPlates] = useState<Plate[]>([]);
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [working, setWorking] = useState(false);
  const [aspect, setAspect] = useState<"16:9" | "9:16">("16:9");
  const [tab, setTab] = useState<Tab>("scenes");
  const [source, setSource] = useState<Source>({ kind: "master" });
  const [linked, setLinked] = useState<number | null>(null);
  const proofRef = useRef<HTMLDivElement>(null);

  const setProof = useCallback(
    async (next: Brief, nextPlates: Plate[], instant = false) => {
      setWorking(true);
      const { brand, project, assets } = toProviderInput(next, nextPlates);
      // 刻意留一拍讓 REC 燈讀得到；引擎本身是毫秒級的
      const [result] = await Promise.all([
        provider.generateStrategy({ brand, project, assets }),
        instant ? Promise.resolve() : new Promise((r) => setTimeout(r, 620)),
      ]);
      setStrategy(result);
      setSource({ kind: "master" });
      setWorking(false);
    },
    [],
  );

  // 首屏就是一份打好的樣，不是空表格
  useEffect(() => {
    void setProof(SAMPLE_BRIEF, [], true);
  }, [setProof]);

  const master = strategy?.master;
  const shownScenes = useMemo<Scene[]>(() => {
    if (!strategy) return [];
    return source.kind === "master"
      ? strategy.master.scenes
      : (strategy.shorts[source.index]?.scenes ?? strategy.master.scenes);
  }, [strategy, source]);

  const assetMap = useMemo(
    () => Object.fromEntries(plates.map((p) => [p.id, p.url])),
    [plates],
  );

  const videoBrand: VideoBrand = useMemo(
    () => ({
      name: brief.brandName || "Your brand",
      primaryColor: brief.accent,
      secondaryColor: "#F7F5F0",
      textColor: "#FFFFFF",
      logoUrl: null,
    }),
    [brief.brandName, brief.accent],
  );

  const linkedScenes = useMemo(() => {
    if (linked === null || !master) return new Set<number>();
    return scenesForPoint(master.scenes, brief.sellingPoints[linked] ?? "");
  }, [linked, master, brief.sellingPoints]);

  const srt = useMemo(
    () => (master ? toSrt(buildSubtitleCues(master.scenes)) : ""),
    [master],
  );

  const patch = (p: Partial<Brief>) => setBrief((b) => ({ ...b, ...p }));

  const onPlates = (files: FileList | null) => {
    if (!files?.length) return;
    const added = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, 6)
      .map((f) => ({ id: `a-${crypto.randomUUID().slice(0, 8)}`, name: f.name, url: URL.createObjectURL(f) }));
    setPlates((p) => [...p, ...added].slice(0, 6));
  };

  const masterTimecodes = master ? timecodes(master.scenes) : [];

  return (
    <>
      <header className="masthead">
        <div className="wordmark">
          ClipForge<span>&nbsp;AI</span>
        </div>
        <div className="masthead-meta">
          <span className="meta">Browser demo · nothing is uploaded or stored</span>
          <a className="meta" href={GITHUB} target="_blank" rel="noreferrer">
            Source on GitHub ↗
          </a>
          <a className="meta" href={FREELANCER} target="_blank" rel="noreferrer">
            Hire me on Freelancer ↗
          </a>
        </div>
      </header>

      <main className="spread">
        {/* ───────────── 左：原稿 ───────────── */}
        <section aria-labelledby="copy-head">
          <h1 className="hero">
            One paragraph in.
            <br />
            A whole <em>content package</em> out.
          </h1>
          <p className="standfirst">
            Describe a product the way you would to a colleague. The engine sets it into a
            scene-by-scene video script, subtitles timed to the second, three vertical cuts and
            copy for four platforms — then plays the result back to you.
          </p>

          <div className="column-head">
            <h2 id="copy-head">Copy</h2>
            <span className="meta">your original</span>
          </div>

          <div className="field">
            <label className="label" htmlFor="brand">Brand or company</label>
            <input
              id="brand"
              type="text"
              value={brief.brandName}
              onChange={(e) => patch({ brandName: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="product">Product or service</label>
            <input
              id="product"
              type="text"
              value={brief.productName}
              onChange={(e) => patch({ productName: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="what">What it is</label>
            <textarea
              id="what"
              value={brief.productDescription}
              onChange={(e) => patch({ productDescription: e.target.value })}
            />
            <p className="field-hint">{brief.productDescription.trim().length} characters</p>
          </div>

          <div className="field">
            <span className="label" style={{ display: "block", marginBottom: 6 }}>
              Selling points
            </span>
            <ul className="points">
              {brief.sellingPoints.map((point, i) => (
                <li
                  key={i}
                  className={`point-row${linked === i ? " is-linked" : ""}`}
                  onMouseEnter={() => setLinked(i)}
                  onMouseLeave={() => setLinked(null)}
                >
                  <span className="point-no">P{i + 1}</span>
                  <input
                    type="text"
                    aria-label={`Selling point ${i + 1}`}
                    value={point}
                    onChange={(e) => {
                      const next = [...brief.sellingPoints];
                      next[i] = e.target.value;
                      patch({ sellingPoints: next });
                    }}
                  />
                  <button
                    type="button"
                    className="point-drop"
                    aria-label={`Remove selling point ${i + 1}`}
                    onClick={() =>
                      patch({ sellingPoints: brief.sellingPoints.filter((_, j) => j !== i) })
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            {brief.sellingPoints.length < 5 && (
              <button
                type="button"
                className="btn-small"
                style={{ marginTop: 12 }}
                onClick={() => patch({ sellingPoints: [...brief.sellingPoints, ""] })}
              >
                + Add a point
              </button>
            )}
            <p className="field-hint">
              {linked !== null && linkedScenes.size === 0 && brief.sellingPoints[linked]?.trim()
                ? `P${linked + 1} did not make the ${brief.masterDuration}s cut — a main video carries three points. Try a longer one, or move it up.`
                : "Hover a point to see which scenes it ended up in."}
            </p>
          </div>

          <div className="field">
            <label className="label" htmlFor="cta">Call to action</label>
            <input
              id="cta"
              type="text"
              value={brief.cta}
              onChange={(e) => patch({ cta: e.target.value })}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="who">Who it is for</label>
            <input
              id="who"
              type="text"
              value={brief.audience}
              onChange={(e) => patch({ audience: e.target.value })}
            />
          </div>

          <div className="controls">
            <label>
              <span className="label">Tone</span>
              <select value={brief.style} onChange={(e) => patch({ style: e.target.value })}>
                {STYLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Main video</span>
              <select
                value={brief.masterDuration}
                onChange={(e) => patch({ masterDuration: Number(e.target.value) })}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} seconds</option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Brand colour</span>
              <input
                type="color"
                aria-label="Brand colour"
                value={brief.accent}
                onChange={(e) => patch({ accent: e.target.value })}
              />
            </label>
          </div>

          <div className="field" style={{ marginTop: 22 }}>
            <span className="label" style={{ display: "block", marginBottom: 6 }}>
              Product photos (optional)
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => onPlates(e.target.files)}
              style={{ fontSize: 14 }}
            />
            <p className="field-hint">Stays in your browser. Nothing is uploaded.</p>
            {plates.length > 0 && (
              <div className="plates">
                {plates.map((p) => (
                  <img key={p.id} className="plate" src={p.url} alt={p.name} />
                ))}
              </div>
            )}
          </div>

          <div className="set-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={working}
              onClick={() => {
                void setProof(brief, plates);
                proofRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {working ? "Setting…" : "Set the proof"}
            </button>
            <span className={`meta${working ? " is-working" : ""}`}>
              <span className="rec-dot" aria-hidden="true" />
              {working ? "Composing" : "Ready"}
            </span>
          </div>
        </section>

        {/* ───────────── 右：打樣 ───────────── */}
        <section className="proof" ref={proofRef} aria-labelledby="proof-head">
          <div className="column-head">
            <h2 id="proof-head">Proof</h2>
            <span className="stamp">Template engine · not a live model</span>
          </div>

          <div className="canvas-wrap">
            <div className="canvas-bar">
              <span className="meta">
                {source.kind === "master"
                  ? master?.title ?? "Main video"
                  : strategy?.shorts[source.index]?.title}
              </span>
              <div className="tabs">
                {(["16:9", "9:16"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="btn-small"
                    aria-pressed={aspect === a}
                    onClick={() => setAspect(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <div className={`canvas${aspect === "9:16" ? " is-vertical" : ""}`}>
              {shownScenes.length > 0 && (
                <Player
                  component={SceneComposition}
                  inputProps={{
                    scenes: shownScenes,
                    brand: videoBrand,
                    subtitleStyle: "classic",
                    assetMap,
                    voiceoverUrl: null,
                    musicUrl: null,
                  }}
                  durationInFrames={totalFrames(shownScenes)}
                  fps={FPS}
                  compositionWidth={aspect === "9:16" ? 1080 : 1920}
                  compositionHeight={aspect === "9:16" ? 1920 : 1080}
                  style={{ width: "100%" }}
                  controls
                  loop
                  // 沒有音軌，autoplay 不會被瀏覽器擋；停在第 0 格是空畫面
                  // （文字動畫還沒進場），第一眼會以為壞了
                  autoPlay
                  acknowledgeRemotionLicense
                />
              )}
            </div>
            <p className="meta" style={{ marginTop: 8 }}>
              Silent preview — the shipped pipeline adds a neural voiceover and renders this to MP4
              on a worker.
            </p>
          </div>

          <div className="tabs" style={{ marginTop: 26 }}>
            {([
              ["scenes", "Cue sheet"],
              ["shorts", "Shorts"],
              ["social", "Social copy"],
              ["subtitles", "Subtitles"],
            ] as const).map(([id, labelText]) => (
              <button
                key={id}
                type="button"
                className="btn-small"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {labelText}
              </button>
            ))}
          </div>

          <div className="sheet">
            {tab === "scenes" && master && (
              <table className="cue-table">
                <caption className="sr-only">Scene-by-scene script for the main video</caption>
                <thead>
                  <tr>
                    <th scope="col">No.</th>
                    <th scope="col">Timecode</th>
                    <th scope="col">On screen &amp; voiceover</th>
                  </tr>
                </thead>
                <tbody>
                  {master.scenes.map((s, i) => (
                    <tr key={s.id} className={linkedScenes.has(i) ? "is-linked" : undefined}>
                      <td className="cue-no">S{String(i + 1).padStart(2, "0")}</td>
                      <td className="cue-tc">{masterTimecodes[i]}</td>
                      <td>
                        <div className="cue-title">
                          {s.title}
                          {linkedScenes.has(i) && (
                            <span className="mark">← P{(linked ?? 0) + 1}</span>
                          )}
                        </div>
                        <div className="cue-line">{s.narration}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === "shorts" && strategy && (
              <div className="stack">
                {strategy.shorts.map((short, i) => (
                  <article className="card" key={short.title + i}>
                    <div className="card-head">
                      <h3>{short.title}</h3>
                      <span className="meta">R{String(i + 2).padStart(2, "0")} · {short.durationSec}s · 9:16</span>
                    </div>
                    <p>{short.hook}</p>
                    <button
                      type="button"
                      className="btn-small"
                      style={{ marginTop: 12 }}
                      onClick={() => {
                        setSource({ kind: "short", index: i });
                        setAspect("9:16");
                      }}
                    >
                      Preview this cut
                    </button>
                  </article>
                ))}
                {source.kind === "short" && (
                  <button
                    type="button"
                    className="btn-small"
                    onClick={() => {
                      setSource({ kind: "master" });
                      setAspect("16:9");
                    }}
                  >
                    ← Back to the main video
                  </button>
                )}
              </div>
            )}

            {tab === "social" && strategy && (
              <div className="stack">
                {([
                  ["YouTube", strategy.socialCopy.youtubeDescription],
                  ["Instagram", strategy.socialCopy.instagram],
                  ["Facebook", strategy.socialCopy.facebook],
                  ["TikTok", strategy.socialCopy.tiktok],
                ] as const).map(([platform, body]) => (
                  <article className="card" key={platform}>
                    <div className="card-head">
                      <span className="label">{platform}</span>
                      <button
                        type="button"
                        className="btn-small"
                        onClick={() => void navigator.clipboard?.writeText(body)}
                      >
                        Copy
                      </button>
                    </div>
                    <p style={{ whiteSpace: "pre-wrap" }}>{body}</p>
                  </article>
                ))}
                <article className="card">
                  <div className="card-head">
                    <span className="label">Thumbnail headlines</span>
                  </div>
                  <p>{strategy.socialCopy.thumbnailTitles.join(" · ")}</p>
                </article>
              </div>
            )}

            {tab === "subtitles" && <pre className="srt">{srt}</pre>}
          </div>

          <div className="deliverables">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => download("subtitles.srt", srt, "text/plain;charset=utf-8")}
            >
              Download SRT
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                download(
                  "content-plan.json",
                  JSON.stringify(strategy, null, 2),
                  "application/json",
                )
              }
            >
              Download plan JSON
            </button>
          </div>

          {strategy?.needsConfirmation && strategy.needsConfirmation.length > 0 && (
            <p className="note" style={{ marginTop: 26 }}>
              <strong>Needs confirmation:</strong> {strategy.needsConfirmation.join(" · ")}
            </p>
          )}
        </section>
      </main>

      <footer className="colophon">
        <div>
          <h4>What this page is</h4>
          <p>
            The same scene-planning engine the product ships as its offline mode, compiled to run
            in your browser. No account, no server, no upload — reload and it is gone.
          </p>
        </div>
        <div>
          <h4>What it is not</h4>
          <p>
            It is a deterministic template engine, not a live model: the same brief always returns
            the same plan. The shipped pipeline sends this step to Claude and validates the reply
            against the same schema before anything reaches the database.
          </p>
        </div>
        <div>
          <h4>What the full product adds</h4>
          <p>
            Neural voiceover, server-side MP4 rendering through a job queue, a scene editor,
            brand and asset libraries, and export tracking.
          </p>
        </div>
        <div>
          <h4>Built by</h4>
          <p>
            Ya-Cheng, a solo full-stack developer in Taiwan. Next.js 15, TypeScript strict mode,
            Prisma, Remotion 4.{" "}
            <a href={FREELANCER} target="_blank" rel="noreferrer">Hire me on Freelancer ↗</a>
          </p>
        </div>
      </footer>
    </>
  );
}
