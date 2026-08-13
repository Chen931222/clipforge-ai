import type { ContentStrategy, Scene, SocialCopy } from "./ai/schemas";
import { pick } from "./i18n";
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
  const lines: string[] = [
    `# ${projectName} — ${pick("影片腳本", "Video Script")}`,
    "",
    `${pick("品牌：", "Brand: ")}${brandName}`,
    "",
  ];
  if (strategy) {
    lines.push(pick(`## 內容策略`, `## Content Strategy`), "", `> ${strategy.strategyOneLiner}`, "");
    if (strategy.painPoints.length) {
      lines.push(
        pick(`**受眾痛點**`, `**Audience pain points**`),
        "",
        ...strategy.painPoints.map((p) => `- ${p}`),
        "",
      );
    }
    if (strategy.coreMessages.length) {
      lines.push(
        pick(`**核心訊息**`, `**Core messages**`),
        "",
        ...strategy.coreMessages.map((m) => `- ${m}`),
        "",
      );
    }
    if (strategy.complianceNote) {
      lines.push(`> ⚠ ${strategy.complianceNote}`, "");
    }
  }
  for (const video of videos) {
    const dur = totalDuration(video.scenes);
    lines.push(
      pick(
        `## ${video.type === "master" ? "主影片" : "短影音"}：${video.title}`,
        `## ${video.type === "master" ? "Master" : "Short"}: ${video.title}`,
      ),
      "",
      pick(`長度 ${dur} 秒｜比例 ${video.aspectRatio}`, `Length ${dur}s · Aspect ${video.aspectRatio}`),
      "",
      pick(`| # | Timecode | 秒數 | 畫面標題 | 旁白 |`, `| # | Timecode | Sec | Title | Narration |`),
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
      pick(`## 社群文案`, `## Social Copy`),
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
      `${pick("**Hashtags**：", "**Hashtags**: ")}${(copy.hashtags ?? []).map((h) => `#${h}`).join(" ")}`,
      "",
      `${pick("**縮圖標題候選**：", "**Thumbnail titles**: ")}${(copy.thumbnailTitles ?? []).join(pick("｜", " / "))}`,
      "",
    );
  }
  return lines.join("\n");
}
