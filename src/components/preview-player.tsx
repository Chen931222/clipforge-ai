"use client";

import { Player } from "@remotion/player";
import { FPS, SceneComposition, totalFrames, type VideoBrand } from "../../remotion/scenes";
import type { Scene } from "@/lib/ai/schemas";
import { pick } from "@/lib/i18n";

/**
 * 編輯器內的影片預覽：直接掛 Remotion Player 跑「渲染用的同一份元件」，
 * 所見即所渲。
 */
export function PreviewPlayer({
  scenes,
  brand,
  subtitleStyle,
  assetMap,
  aspect,
}: {
  scenes: Scene[];
  brand: VideoBrand;
  subtitleStyle: string;
  assetMap: Record<string, string>;
  aspect: "16:9" | "9:16";
}) {
  const isVertical = aspect === "9:16";
  if (scenes.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-md border border-rule bg-well text-sm text-paper/60">
        {pick("沒有場景可預覽", "No scenes to preview")}
      </div>
    );
  }
  return (
    <div
      className={
        isVertical
          ? "mx-auto w-full max-w-[280px] overflow-hidden rounded-md border border-ink bg-well"
          : "w-full overflow-hidden rounded-md border border-ink bg-well"
      }
    >
      <Player
        component={SceneComposition}
        inputProps={{
          scenes,
          brand,
          subtitleStyle,
          assetMap,
          voiceoverUrl: null,
          musicUrl: null,
        }}
        durationInFrames={totalFrames(scenes)}
        fps={FPS}
        compositionWidth={isVertical ? 1080 : 1920}
        compositionHeight={isVertical ? 1920 : 1080}
        style={{ width: "100%" }}
        controls
        loop
        acknowledgeRemotionLicense
      />
    </div>
  );
}
