"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { clsx } from "clsx";
import type { Scene } from "@/lib/ai/schemas";
import { formatTimecode } from "@/lib/srt";
import { PreviewPlayer } from "./preview-player";
import { Button, Field, Input, SceneNo, Select, StatusStamp, Textarea } from "./ui";

export interface EditorVideo {
  id: string;
  type: string;
  title: string;
  aspectRatio: string;
  subtitleStyle: string;
  status: string;
  scenes: Scene[];
}

export interface EditorAsset {
  id: string;
  originalName: string;
  storageUrl: string;
  type: string;
}

export interface EditorBrand {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  logoUrl: string | null;
}

const ASSET_MODES = [
  ["cover", "滿版"],
  ["center", "置中"],
  ["split", "左右分割"],
  ["blur-bg", "背景模糊"],
] as const;
const ANIMATIONS = [
  ["fade", "淡入"],
  ["rise", "上移"],
  ["zoom", "縮放"],
  ["slide-left", "左滑入"],
  ["slide-right", "右滑入"],
] as const;
const TRANSITIONS = [
  ["cut", "直切"],
  ["fade", "淡接"],
  ["slide", "滑動"],
  ["wipe", "擦除"],
] as const;
const SUBTITLE_STYLES = [
  ["classic", "經典"],
  ["bold-short", "短影音粗體"],
  ["minimal-luxe", "高級極簡"],
] as const;

function newScene(brandColor: string): Scene {
  return {
    id: `s-${crypto.randomUUID().slice(0, 8)}`,
    durationSec: 5,
    narration: "",
    title: "新場景",
    subtitle: "",
    assetId: null,
    assetMode: "center",
    animation: "fade",
    transition: "fade",
    backgroundColor: brandColor,
    needsConfirmation: false,
  };
}

export function SceneEditor({
  projectId,
  videos,
  activeVideoId,
  assets,
  brand,
}: {
  projectId: string;
  videos: EditorVideo[];
  activeVideoId: string;
  assets: EditorAsset[];
  brand: EditorBrand;
}) {
  const router = useRouter();
  const video = videos.find((v) => v.id === activeVideoId) ?? videos[0];
  const [scenes, setScenes] = useState<Scene[]>(video?.scenes ?? []);
  const [subtitleStyle, setSubtitleStyle] = useState(video?.subtitleStyle ?? "classic");
  const [selectedId, setSelectedId] = useState<string | null>(video?.scenes[0]?.id ?? null);
  const [aspect, setAspect] = useState<"16:9" | "9:16">(
    video?.aspectRatio === "9:16" ? "9:16" : "16:9",
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selected = scenes.find((s) => s.id === selectedId) ?? null;
  const total = scenes.reduce((s, sc) => s + sc.durationSec, 0);

  const assetMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const a of assets) map[a.id] = a.storageUrl;
    if (brand.logoUrl) map["__logo__"] = brand.logoUrl;
    return map;
  }, [assets, brand.logoUrl]);

  if (!video) return null;

  function mutate(updater: (prev: Scene[]) => Scene[]) {
    setScenes((prev) => updater(prev));
    setDirty(true);
    setMessage(null);
  }

  function updateSelected(patch: Partial<Scene>) {
    if (!selectedId) return;
    mutate((prev) => prev.map((s) => (s.id === selectedId ? { ...s, ...patch } : s)));
  }

  function move(id: string, dir: -1 | 1) {
    mutate((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function duplicate(id: string) {
    mutate((prev) => {
      const i = prev.findIndex((s) => s.id === id);
      if (i === -1) return prev;
      const copy = { ...prev[i], id: `s-${crypto.randomUUID().slice(0, 8)}` };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  }

  function removeScene(id: string) {
    const target = scenes.find((s) => s.id === id);
    if (!confirm(`確定刪除場景「${target?.title ?? ""}」？`)) return;
    mutate((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  async function save() {
    setBusy("save");
    const res = await fetch(`/api/videos/${video.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenes, subtitleStyle }),
    });
    setBusy(null);
    if (res.ok) {
      setDirty(false);
      setMessage("已儲存");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setMessage(data?.error?.message ?? "儲存失敗");
    }
  }

  async function regenerateSelected() {
    if (!selected) return;
    if (dirty && !confirm("重新生成前建議先儲存。仍要繼續嗎？（只會改這個場景的文字）")) return;
    setBusy("regen");
    const res = await fetch(`/api/videos/${video.id}/regenerate-scene`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sceneId: selected.id }),
    });
    setBusy(null);
    if (res.ok) {
      const { data } = await res.json();
      setScenes((prev) => prev.map((s) => (s.id === selected.id ? data.scene : s)));
      setMessage("已重新生成此場景文字");
    } else {
      const data = await res.json().catch(() => null);
      setMessage(data?.error?.message ?? "重新生成失敗");
    }
  }

  function speakPreview() {
    if (!selected?.narration) return;
    const utter = new SpeechSynthesisUtterance(selected.narration);
    utter.lang = "zh-TW";
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  function switchVideo(id: string) {
    if (dirty && !confirm("尚未儲存的變更會遺失，確定切換影片？")) return;
    router.push(`/projects/${projectId}/editor?video=${id}`);
  }

  const narrationLimit = selected ? Math.floor(selected.durationSec * 4) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* 左欄：cue sheet 場景列 */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Select
            value={video.id}
            onChange={(e) => switchVideo(e.target.value)}
            className="max-w-72"
            aria-label="選擇影片"
          >
            {videos.map((v) => (
              <option key={v.id} value={v.id}>
                {v.type === "master" ? "主影片" : "短影音"}｜{v.title}
              </option>
            ))}
          </Select>
          <StatusStamp status={video.status} />
        </div>

        <div className="overflow-hidden rounded-md border border-rule bg-sheet">
          <div className="flex items-center justify-between border-b border-ink px-4 py-2">
            <span className="font-mono text-[11px] tracking-widest text-ink-40">CUE SHEET</span>
            <span className="font-mono text-xs">
              TOTAL {formatTimecode(total)}
            </span>
          </div>
          <ul>
            {scenes.map((scene, i) => {
              const start = scenes.slice(0, i).reduce((s, sc) => s + sc.durationSec, 0);
              return (
                <li
                  key={scene.id}
                  className={clsx(
                    "flex cursor-pointer items-start gap-3 border-b border-rule px-4 py-3 transition-colors",
                    selectedId === scene.id ? "bg-paper" : "hover:bg-paper/60",
                  )}
                  onClick={() => setSelectedId(scene.id)}
                >
                  <div className="pt-0.5">
                    <SceneNo n={i + 1} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] text-ink-40">
                        {formatTimecode(start)}–{formatTimecode(start + scene.durationSec)}
                      </span>
                      {scene.needsConfirmation ? (
                        <span className="font-mono text-[11px] text-rec">待確認</span>
                      ) : null}
                    </div>
                    <div className="truncate text-sm font-medium">{scene.title || "（未命名）"}</div>
                    <div className="truncate text-xs text-ink-60">{scene.narration}</div>
                  </div>
                  <div
                    className="flex shrink-0 gap-1 font-mono text-[11px] text-ink-40"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="px-1 hover:text-ink" title="上移" onClick={() => move(scene.id, -1)}>
                      ↑
                    </button>
                    <button className="px-1 hover:text-ink" title="下移" onClick={() => move(scene.id, 1)}>
                      ↓
                    </button>
                    <button className="px-1 hover:text-ink" title="複製" onClick={() => duplicate(scene.id)}>
                      ⧉
                    </button>
                    <button
                      className="px-1 hover:text-rec"
                      title="刪除"
                      onClick={() => removeScene(scene.id)}
                    >
                      ✕
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="w-full px-4 py-3 text-start text-sm text-ink-60 hover:bg-paper"
            onClick={() => {
              const s = newScene(brand.primaryColor);
              mutate((prev) => [...prev, s]);
              setSelectedId(s.id);
            }}
          >
            ＋ 新增場景
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={save} disabled={busy === "save" || !dirty}>
            {busy === "save" ? "儲存中…" : dirty ? "儲存變更" : "已儲存"}
          </Button>
          <a
            href={`/api/videos/${video.id}/export/srt`}
            className="text-sm underline underline-offset-4"
          >
            下載 SRT
          </a>
          <Link
            href={`/projects/${projectId}/renders`}
            className="text-sm underline underline-offset-4"
          >
            前往渲染
          </Link>
          {message ? <span className="font-mono text-xs text-ink-60">{message}</span> : null}
        </div>
      </section>

      {/* 右欄：預覽＋場景設定 */}
      <section className="flex flex-col gap-5">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex gap-1 rounded-[4px] border border-rule p-0.5">
              {(["16:9", "9:16"] as const).map((a) => (
                <button
                  key={a}
                  className={clsx(
                    "rounded-[3px] px-3 py-1 font-mono text-xs transition-colors",
                    aspect === a ? "bg-ink text-paper" : "text-ink-60 hover:text-ink",
                  )}
                  onClick={() => setAspect(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <Field label="字幕樣式" className="w-40 !flex-row items-center gap-2">
              <Select
                value={subtitleStyle}
                onChange={(e) => {
                  setSubtitleStyle(e.target.value);
                  setDirty(true);
                }}
              >
                {SUBTITLE_STYLES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <PreviewPlayer
            scenes={scenes}
            brand={brand}
            subtitleStyle={subtitleStyle}
            assetMap={assetMap}
            aspect={aspect}
          />
        </div>

        {selected ? (
          <div className="rounded-md border border-rule bg-sheet p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold">
                場景 S{String(scenes.findIndex((s) => s.id === selected.id) + 1).padStart(2, "0")}
              </h2>
              <div className="flex gap-2">
                <Button onClick={regenerateSelected} disabled={busy === "regen"}>
                  {busy === "regen" ? "生成中…" : "重新生成此場景文字"}
                </Button>
                <Button onClick={speakPreview} disabled={!selected.narration}>
                  語音預覽
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
                <Field label="秒數">
                  <Input
                    type="number"
                    min={1}
                    max={40}
                    value={selected.durationSec}
                    onChange={(e) =>
                      updateSelected({ durationSec: Math.max(1, Math.min(40, Number(e.target.value) || 1)) })
                    }
                  />
                </Field>
                <Field
                  label="旁白"
                  hint={`中文口語約每秒 4 字，此場景建議 ${narrationLimit} 字內（目前 ${selected.narration.length} 字）`}
                >
                  <Textarea
                    value={selected.narration}
                    rows={3}
                    maxLength={400}
                    onChange={(e) => updateSelected({ narration: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="畫面標題">
                  <Input
                    value={selected.title}
                    maxLength={60}
                    onChange={(e) => updateSelected({ title: e.target.value })}
                  />
                </Field>
                <Field label="畫面副標">
                  <Input
                    value={selected.subtitle ?? ""}
                    maxLength={80}
                    onChange={(e) => updateSelected({ subtitle: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="使用素材">
                  <Select
                    value={selected.assetId ?? ""}
                    onChange={(e) => updateSelected({ assetId: e.target.value || null })}
                  >
                    <option value="">不使用（背景色）</option>
                    {assets
                      .filter((a) => a.type !== "pdf")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.originalName}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="素材顯示方式">
                  <Select
                    value={selected.assetMode}
                    onChange={(e) => updateSelected({ assetMode: e.target.value as Scene["assetMode"] })}
                  >
                    {ASSET_MODES.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="動畫">
                  <Select
                    value={selected.animation}
                    onChange={(e) => updateSelected({ animation: e.target.value as Scene["animation"] })}
                  >
                    {ANIMATIONS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="轉場（進場）">
                  <Select
                    value={selected.transition}
                    onChange={(e) => updateSelected({ transition: e.target.value as Scene["transition"] })}
                  >
                    {TRANSITIONS.map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="背景色">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selected.backgroundColor ?? brand.primaryColor}
                      onChange={(e) => updateSelected({ backgroundColor: e.target.value })}
                      aria-label="背景色"
                    />
                    <span className="font-mono text-xs text-ink-60">
                      {selected.backgroundColor ?? brand.primaryColor}
                    </span>
                  </div>
                </Field>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-rule bg-sheet p-8 text-center text-sm text-ink-60">
            從左側 cue sheet 選一個場景開始編輯。
          </div>
        )}
      </section>
    </div>
  );
}
