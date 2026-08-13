"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pick } from "@/lib/i18n";
import { formatTimecode } from "@/lib/srt";
import { Button, StatusStamp } from "./ui";

export interface RenderJobView {
  id: string;
  status: string;
  progress: number;
  outputUrl: string | null;
  errorMessage: string | null;
}

export interface RenderVideoView {
  id: string;
  type: string;
  title: string;
  aspectRatio: string;
  duration: number;
  sceneCount: number;
  status: string;
  latestJob: RenderJobView | null;
}

/** 渲染與匯出中心（規格 §4.6/§4.7）：建 job、輪詢進度、下載輸出。 */
export function RenderCenter({
  projectId,
  initialVideos,
}: {
  projectId: string;
  initialVideos: RenderVideoView[];
}) {
  const router = useRouter();
  const [videos, setVideos] = useState(initialVideos);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef(false);

  const hasActive = videos.some(
    (v) => v.latestJob && ["queued", "processing"].includes(v.latestJob.status),
  );

  useEffect(() => {
    if (!hasActive || pollingRef.current) return;
    pollingRef.current = true;
    const timer = setInterval(async () => {
      const active = videos.filter(
        (v) => v.latestJob && ["queued", "processing"].includes(v.latestJob.status),
      );
      if (active.length === 0) {
        clearInterval(timer);
        pollingRef.current = false;
        router.refresh();
        return;
      }
      for (const v of active) {
        const res = await fetch(`/api/render-jobs/${v.latestJob!.id}`);
        if (!res.ok) continue;
        const { data } = await res.json();
        setVideos((prev) =>
          prev.map((x) =>
            x.id === v.id
              ? {
                  ...x,
                  status: data.status === "completed" ? "rendered" : x.status,
                  latestJob: {
                    id: data.id,
                    status: data.status,
                    progress: data.progress,
                    outputUrl: data.outputUrl,
                    errorMessage: data.errorMessage,
                  },
                }
              : x,
          ),
        );
      }
    }, 2000);
    return () => {
      clearInterval(timer);
      pollingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActive]);

  async function startRender(videoId: string, isRerender: boolean) {
    const rerenderConfirm = pick(
      "重新渲染會產生新的輸出檔（舊檔保留）。繼續嗎？",
      "Re-rendering creates a new output file. The old one is kept. Continue?",
    );
    if (isRerender && !confirm(rerenderConfirm)) return;
    setError(null);
    const res = await fetch(`/api/videos/${videoId}/render`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? pick("建立渲染工作失敗", "Could not start the render job"));
      return;
    }
    const { data } = await res.json();
    setVideos((prev) =>
      prev.map((v) =>
        v.id === videoId
          ? {
              ...v,
              status: "rendering",
              latestJob: {
                id: data.id,
                status: data.status,
                progress: 0,
                outputUrl: null,
                errorMessage: null,
              },
            }
          : v,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? <p className="text-sm text-rec">{error}</p> : null}
      <div className="overflow-x-auto rounded-md border border-rule bg-sheet">
        <table className="cue-table min-w-[720px]">
          <thead>
            <tr>
              <th>NO.</th>
              <th>{pick("影片", "Video")}</th>
              <th>{pick("規格", "Format")}</th>
              <th>{pick("渲染狀態", "Render status")}</th>
              <th>{pick("輸出", "Output")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {videos.map((v, i) => {
              const job = v.latestJob;
              const active = job && ["queued", "processing"].includes(job.status);
              return (
                <tr key={v.id}>
                  <td className="font-mono text-xs text-ink-40">
                    R{String(i + 1).padStart(2, "0")}
                  </td>
                  <td>
                    <div className="text-sm font-medium">{v.title}</div>
                    <div className="font-mono text-[11px] text-ink-40">
                      {pick(
                        `${v.type === "master" ? "主影片" : "短影音"}・${v.sceneCount} 場景`,
                        `${v.type === "master" ? "Master" : "Short"}・${v.sceneCount} scenes`,
                      )}
                    </div>
                  </td>
                  <td className="font-mono text-xs">
                    {v.aspectRatio}・{formatTimecode(v.duration)}
                    <div className="text-ink-40">
                      {v.aspectRatio === "16:9" ? "1920×1080" : "1080×1920"}
                    </div>
                  </td>
                  <td>
                    {job ? (
                      <div className="flex flex-col gap-1.5">
                        <StatusStamp status={job.status} />
                        {active ? (
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-rule">
                            <div
                              className="h-full bg-rec transition-[width] duration-300"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        ) : null}
                        {job.status === "failed" && job.errorMessage ? (
                          <span className="max-w-52 text-xs text-rec">{job.errorMessage}</span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-ink-40">
                        {pick("尚未渲染", "Not rendered")}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex flex-col gap-1 text-sm">
                      {job?.status === "completed" && job.outputUrl ? (
                        <a href={job.outputUrl} className="underline underline-offset-4" download>
                          {pick("下載 MP4", "Download MP4")}
                        </a>
                      ) : null}
                      <a
                        href={`/api/videos/${v.id}/export/srt`}
                        className="underline underline-offset-4"
                      >
                        {pick("SRT 字幕", "SRT subtitles")}
                      </a>
                    </div>
                  </td>
                  <td>
                    <Button
                      variant={job?.status === "completed" ? "secondary" : "primary"}
                      disabled={Boolean(active)}
                      onClick={() => startRender(v.id, Boolean(job))}
                    >
                      {active ? (
                        <>
                          <span className="rec-dot h-2 w-2 rounded-full bg-rec" />
                          {pick("渲染中", "Rendering")} {job?.progress ?? 0}%
                        </>
                      ) : job ? (
                        pick("重新渲染", "Re-render")
                      ) : (
                        pick("渲染 MP4", "Render MP4")
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="font-mono text-xs text-ink-40">
        {pick(
          "渲染由獨立 worker 處理（pnpm worker）。worker 未啟動時，工作會停在「排隊中」。",
          "Rendering runs in a separate worker (pnpm worker). Jobs stay Queued until it starts.",
        )}
      </p>
      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/projects/${projectId}/export/script`}
          className="rounded-[4px] border border-ink px-4 py-2 text-sm hover:bg-sheet"
        >
          {pick("下載 Markdown 腳本", "Download Markdown script")}
        </a>
        <a
          href={`/api/projects/${projectId}/export/json`}
          className="rounded-[4px] border border-ink px-4 py-2 text-sm hover:bg-sheet"
        >
          {pick("下載專案 JSON", "Download project JSON")}
        </a>
      </div>
    </div>
  );
}
