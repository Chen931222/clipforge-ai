import type { ContentStrategy, Scene, SocialCopy } from "./ai/schemas";
import { formatTimecode, totalDuration } from "./srt";

interface VideoForExport {
  title: string;
  type: string;
  aspectRatio: string;
  scenes: Scene[];
  socialCopy?: Partial<SocialCopy> | null;
}

/** 專案腳本的 Markdown 匯出（規格 §4.7） */
export function projectScriptMarkdown(
  projectName: string,
  brandName: string,
  strategy: ContentStrategy | null,
  videos: VideoForExport[],
): string {
  const lines: string[] = [`# ${projectName} — 影片腳本`, "", `品牌：${brandName}`, ""];
  if (strategy) {
    lines.push(`## 內容策略`, "", `> ${strategy.strategyOneLiner}`, "");
    if (strategy.painPoints.length) {
      lines.push(`**受眾痛點**`, "", ...strategy.painPoints.map((p) => `- ${p}`), "");
    }
    if (strategy.coreMessages.length) {
      lines.push(`**核心訊息**`, "", ...strategy.coreMessages.map((m) => `- ${m}`), "");
    }
    if (strategy.complianceNote) {
      lines.push(`> ⚠ ${strategy.complianceNote}`, "");
    }
  }
  for (const video of videos) {
    const dur = totalDuration(video.scenes);
    lines.push(
      `## ${video.type === "master" ? "主影片" : "短影音"}：${video.title}`,
      "",
      `長度 ${dur} 秒｜比例 ${video.aspectRatio}`,
      "",
      `| # | Timecode | 秒數 | 畫面標題 | 旁白 |`,
      `|---|---|---|---|---|`,
    );
    let cursor = 0;
    video.scenes.forEach((scene, i) => {
      lines.push(
        `| S${String(i + 1).padStart(2, "0")} | ${formatTimecode(cursor)}–${formatTimecode(cursor + scene.durationSec)} | ${scene.durationSec}s | ${scene.title.replace(/\|/g, "／")} | ${scene.narration.replace(/\|/g, "／")} |`,
      );
      cursor += scene.durationSec;
    });
    lines.push("");
  }
  const master = videos.find((v) => v.type === "master");
  const copy = master?.socialCopy;
  if (copy && copy.youtubeTitle) {
    lines.push(
      `## 社群文案`,
      "",
      `### YouTube`,
      "",
      `**${copy.youtubeTitle}**`,
      "",
      copy.youtubeDescription ?? "",
      "",
      `### Instagram`,
      "",
      copy.instagram ?? "",
      "",
      `### Facebook`,
      "",
      copy.facebook ?? "",
      "",
      `### TikTok`,
      "",
      copy.tiktok ?? "",
      "",
      `**Hashtags**：${(copy.hashtags ?? []).map((h) => `#${h}`).join(" ")}`,
      "",
      `**縮圖標題候選**：${(copy.thumbnailTitles ?? []).join("｜")}`,
      "",
    );
  }
  return lines.join("\n");
}
