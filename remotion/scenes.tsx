import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Scene } from "../src/lib/ai/schemas";
import { buildSubtitleCues, type SubtitleCue } from "../src/lib/srt";

export const FPS = 30;

export interface VideoBrand {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  logoUrl?: string | null;
  name: string;
}

export interface SceneCompositionProps {
  // Remotion 的 Composition 泛型要求 props 相容 Record<string, unknown>
  [key: string]: unknown;
  scenes: Scene[];
  brand: VideoBrand;
  subtitleStyle: string;
  /** assetId → 可載入的 URL（Player 用同源路徑；worker 用 data URL） */
  assetMap: Record<string, string>;
  /** 整軌配音（mock TTS） */
  voiceoverUrl?: string | null;
  /** 每場景配音 clips：sceneId → URL（真 TTS）；與 voiceoverUrl 擇一 */
  voiceClips?: Record<string, string> | null;
  musicUrl?: string | null;
  voiceVolume?: number;
  musicVolume?: number;
}

export function totalFrames(scenes: Scene[]): number {
  return Math.max(1, Math.round(scenes.reduce((s, sc) => s + sc.durationSec, 0) * FPS));
}

/** 依背景亮度挑可讀的文字色 */
function readableText(bg: string, brand: VideoBrand): string {
  const hex = bg.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma > 150 ? "#1C1A15" : brand.textColor;
}

const FONT_SERIF = '"Noto Serif TC", "PMingLiU", serif';
const FONT_SANS = '"Noto Sans TC", "Microsoft JhengHei", sans-serif';

function KenBurnsImage({
  src,
  mode,
  durationFrames,
  seed,
}: {
  src: string;
  mode: "cover" | "blur";
  durationFrames: number;
  seed: number;
}) {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationFrames], [1.04, 1.14], {
    extrapolateRight: "clamp",
  });
  const drift = interpolate(frame, [0, durationFrames], [0, seed % 2 === 0 ? -24 : 24], {
    extrapolateRight: "clamp",
  });
  return (
    <Img
      src={src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        transform: `scale(${scale}) translateX(${drift}px)`,
        filter: mode === "blur" ? "blur(28px) brightness(0.55)" : undefined,
      }}
    />
  );
}

function SceneBlock({
  scene,
  index,
  brand,
  assetMap,
  isVertical,
}: {
  scene: Scene;
  index: number;
  brand: VideoBrand;
  assetMap: Record<string, string>;
  isVertical: boolean;
}) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const bg = scene.backgroundColor ?? brand.primaryColor;
  const textColor = readableText(bg, brand);
  const assetUrl = scene.assetId ? assetMap[scene.assetId] : undefined;
  const durationFrames = Math.round(scene.durationSec * FPS);

  // 進場轉場（前 12 幀）
  const t = Math.min(1, frame / 12);
  let containerStyle: React.CSSProperties = {};
  if (scene.transition === "fade") containerStyle = { opacity: t };
  else if (scene.transition === "slide")
    containerStyle = { transform: `translateX(${(1 - t) * 6}%)`, opacity: 0.4 + t * 0.6 };
  else if (scene.transition === "wipe")
    containerStyle = { clipPath: `inset(0 ${(1 - t) * 100}% 0 0)` };

  // 內容動畫（14 幀完成）
  const ct = Math.min(1, Math.max(0, (frame - 4) / 14));
  const ease = 1 - Math.pow(1 - ct, 3);
  let contentTransform = "none";
  let contentOpacity = ease;
  switch (scene.animation) {
    case "rise":
      contentTransform = `translateY(${(1 - ease) * 46}px)`;
      break;
    case "zoom":
      contentTransform = `scale(${0.92 + ease * 0.08})`;
      break;
    case "slide-left":
      contentTransform = `translateX(${(1 - ease) * 70}px)`;
      break;
    case "slide-right":
      contentTransform = `translateX(${(1 - ease) * -70}px)`;
      break;
    default:
      contentOpacity = ease;
  }

  const titleSize = isVertical ? 76 : 88;
  const subtitleSize = isVertical ? 34 : 38;
  const pad = isVertical ? 72 : 110;

  const renderText = (color: string, center = false) => (
    <div
      style={{
        transform: contentTransform,
        opacity: contentOpacity,
        display: "flex",
        flexDirection: "column",
        gap: 20,
        maxWidth: isVertical ? "88%" : "72%",
        marginInline: center ? "auto" : undefined,
      }}
    >
      {scene.subtitle ? (
        <div
          style={{
            fontFamily: FONT_SANS,
            fontSize: subtitleSize * 0.72,
            letterSpacing: "0.22em",
            color,
            opacity: 0.72,
          }}
        >
          {scene.subtitle}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontWeight: 700,
          fontSize: titleSize,
          lineHeight: 1.18,
          color,
          textWrap: "balance" as never,
        }}
      >
        {scene.title}
      </div>
    </div>
  );
  const textBlock = renderText(textColor);

  let body: React.ReactNode;
  if (assetUrl && scene.assetMode === "cover") {
    body = (
      <>
        <AbsoluteFill>
          <KenBurnsImage src={assetUrl} mode="cover" durationFrames={durationFrames} seed={index} />
        </AbsoluteFill>
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(to top, rgba(10,10,8,0.72) 0%, rgba(10,10,8,0.12) 55%)",
          }}
        />
        <AbsoluteFill style={{ justifyContent: "flex-end", padding: pad }}>
          {renderText("#FFFFFF")}
        </AbsoluteFill>
      </>
    );
  } else if (assetUrl && scene.assetMode === "blur-bg") {
    body = (
      <>
        <AbsoluteFill>
          <KenBurnsImage src={assetUrl} mode="blur" durationFrames={durationFrames} seed={index} />
        </AbsoluteFill>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: pad }}>
          <div style={{ textAlign: "center" }}>{renderText("#FFFFFF")}</div>
        </AbsoluteFill>
      </>
    );
  } else if (assetUrl && scene.assetMode === "split" && !isVertical) {
    body = (
      <AbsoluteFill style={{ flexDirection: "row" }}>
        <div style={{ width: "50%", height: "100%", overflow: "hidden" }}>
          <KenBurnsImage src={assetUrl} mode="cover" durationFrames={durationFrames} seed={index} />
        </div>
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            padding: pad * 0.7,
            boxSizing: "border-box",
          }}
        >
          {textBlock}
        </div>
      </AbsoluteFill>
    );
  } else if (assetUrl && (scene.assetMode === "center" || (scene.assetMode === "split" && isVertical))) {
    body = (
      <AbsoluteFill
        style={{
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 48,
          padding: pad,
        }}
      >
        <div
          style={{
            width: isVertical ? "78%" : "44%",
            aspectRatio: "4 / 3",
            overflow: "hidden",
            borderRadius: 8,
          }}
        >
          <KenBurnsImage src={assetUrl} mode="cover" durationFrames={durationFrames} seed={index} />
        </div>
        <div style={{ textAlign: "center" }}>{textBlock}</div>
      </AbsoluteFill>
    );
  } else {
    // 純文字場景（例如 CTA）
    body = (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: pad,
          flexDirection: "column",
          gap: 40,
        }}
      >
        {brand.logoUrl ? (
          <Img
            src={assetMap["__logo__"] ?? brand.logoUrl}
            style={{ width: isVertical ? 150 : 130, height: "auto", opacity: contentOpacity }}
          />
        ) : null}
        <div style={{ textAlign: "center" }}>{textBlock}</div>
      </AbsoluteFill>
    );
  }

  void durationInFrames;
  return (
    <AbsoluteFill style={{ backgroundColor: bg, ...containerStyle }}>
      {body}
    </AbsoluteFill>
  );
}

const SUBTITLE_STYLES: Record<
  string,
  (isVertical: boolean) => React.CSSProperties
> = {
  classic: (v) => ({
    fontFamily: FONT_SANS,
    fontSize: v ? 40 : 44,
    fontWeight: 500,
    color: "#FFFFFF",
    textShadow: "0 2px 10px rgba(0,0,0,0.85)",
  }),
  "bold-short": (v) => ({
    fontFamily: FONT_SANS,
    fontSize: v ? 56 : 58,
    fontWeight: 900,
    color: "#FFFFFF",
    WebkitTextStroke: "2px rgba(0,0,0,0.9)",
    textShadow: "0 4px 0 rgba(0,0,0,0.55)",
  }),
  "minimal-luxe": (v) => ({
    fontFamily: FONT_SERIF,
    fontSize: v ? 38 : 40,
    fontWeight: 500,
    letterSpacing: "0.12em",
    color: "rgba(255,255,255,0.94)",
    textShadow: "0 1px 6px rgba(0,0,0,0.7)",
  }),
};

function Subtitles({
  cues,
  style,
  isVertical,
}: {
  cues: SubtitleCue[];
  style: string;
  isVertical: boolean;
}) {
  const frame = useCurrentFrame();
  const ms = (frame / FPS) * 1000;
  const current = cues.find((c) => ms >= c.startMs && ms < c.endMs);
  if (!current) return null;
  const css = (SUBTITLE_STYLES[style] ?? SUBTITLE_STYLES.classic)(isVertical);
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: isVertical ? 200 : 64,
        pointerEvents: "none",
      }}
    >
      <div style={{ ...css, maxWidth: "86%", textAlign: "center" }}>{current.text}</div>
    </AbsoluteFill>
  );
}

export const SceneComposition: React.FC<SceneCompositionProps> = ({
  scenes,
  brand,
  subtitleStyle,
  assetMap,
  voiceoverUrl,
  voiceClips,
  musicUrl,
  voiceVolume = 1,
  musicVolume = 0.45,
}) => {
  const { width, height } = useVideoConfig();
  const isVertical = height > width;
  const cues = buildSubtitleCues(scenes);
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: brand.primaryColor }}>
      {scenes.map((scene, i) => {
        const from = cursor;
        const dur = Math.round(scene.durationSec * FPS);
        cursor += dur;
        const clipUrl = voiceClips?.[scene.id];
        return (
          <Sequence key={scene.id} from={from} durationInFrames={dur}>
            <SceneBlock
              scene={scene}
              index={i}
              brand={brand}
              assetMap={assetMap}
              isVertical={isVertical}
            />
            {clipUrl ? <Audio src={clipUrl} volume={voiceVolume} /> : null}
          </Sequence>
        );
      })}
      <Subtitles cues={cues} style={subtitleStyle} isVertical={isVertical} />
      {brand.logoUrl ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-start",
            alignItems: "flex-end",
            padding: isVertical ? 40 : 48,
            pointerEvents: "none",
          }}
        >
          <Img
            src={assetMap["__logo__"] ?? brand.logoUrl}
            style={{ width: isVertical ? 88 : 92, height: "auto", opacity: 0.9 }}
          />
        </AbsoluteFill>
      ) : null}
      {voiceoverUrl ? <Audio src={voiceoverUrl} volume={voiceVolume} /> : null}
      {musicUrl ? <Audio src={musicUrl} volume={musicVolume} /> : null}
    </AbsoluteFill>
  );
};
