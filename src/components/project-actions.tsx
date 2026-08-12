"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "./ui";

/** 素材上傳與清單（規格 §4.2/§14） */
export function AssetUploader({
  projectId,
  assets,
}: {
  projectId: string;
  assets: { id: string; originalName: string; storageUrl: string; mimeType: string }[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/assets`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error?.message ?? `上傳 ${file.name} 失敗`);
        break;
      }
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function remove(assetId: string, name: string) {
    if (!confirm(`確定刪除素材「${name}」？場景中引用它的畫面會改用背景色。`)) return;
    await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
          multiple
          onChange={(e) => upload(e.target.files)}
          className="text-sm file:me-3 file:rounded-[4px] file:border file:border-ink file:bg-sheet file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-paper"
          aria-label="上傳素材"
        />
        {busy ? <span className="font-mono text-xs text-ink-40">上傳中…</span> : null}
      </div>
      <p className="text-xs text-ink-40">
        支援 PNG／JPG／WebP／SVG／PDF，單檔 10MB 內。檔案會重新命名保存。
      </p>
      {error ? <p className="text-sm text-rec">{error}</p> : null}
      {assets.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {assets.map((a) => (
            <li key={a.id} className="group relative rounded-md border border-rule bg-paper p-2">
              {a.mimeType === "application/pdf" ? (
                <div className="flex h-20 items-center justify-center font-mono text-xs text-ink-40">
                  PDF
                </div>
              ) : (
                <Image
                  src={a.storageUrl}
                  alt={a.originalName}
                  width={160}
                  height={80}
                  unoptimized
                  className="h-20 w-full rounded object-cover"
                />
              )}
              <div className="mt-1 truncate text-xs text-ink-60" title={a.originalName}>
                {a.originalName}
              </div>
              <button
                type="button"
                onClick={() => remove(a.id, a.originalName)}
                className="absolute right-1 top-1 hidden rounded bg-sheet/90 px-1.5 py-0.5 font-mono text-[11px] text-rec group-hover:block"
              >
                刪除
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-60">還沒有素材。沒有圖片也能生成，場景會使用品牌色背景。</p>
      )}
    </div>
  );
}

/** 生成企劃（規格 §12：生成前顯示輸入、覆蓋前確認） */
export function GenerateButton({
  projectId,
  hasStrategy,
  inputsSummary,
}: {
  projectId: string;
  hasStrategy: boolean;
  inputsSummary: string[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (
      hasStrategy &&
      !confirm("重新生成會覆蓋現有的企劃與所有影片腳本（包含你編輯過的場景）。確定要繼續嗎？")
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${projectId}/generate`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      router.push(`/projects/${projectId}/strategy`);
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "生成失敗，請再試一次");
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-md border border-rule bg-paper p-4">
        <div className="font-mono text-[11px] tracking-widest text-ink-40">AI 將使用以下輸入</div>
        <ul className="mt-2 grid gap-1 text-sm text-ink-60">
          {inputsSummary.map((line, i) => (
            <li key={i}>・{line}</li>
          ))}
        </ul>
      </div>
      <Button variant="primary" onClick={generate} disabled={busy} className="self-start">
        {busy ? (
          <>
            <span className="rec-dot h-2 w-2 rounded-full bg-white" />
            企劃生成中…
          </>
        ) : hasStrategy ? (
          "重新生成企劃與腳本"
        ) : (
          "生成企劃與腳本"
        )}
      </Button>
      {error ? <p className="text-sm text-rec">{error}</p> : null}
    </div>
  );
}

export function DeleteProjectButton({ projectId, name }: { projectId: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="danger"
      disabled={busy}
      onClick={async () => {
        if (!confirm(`確定刪除專案「${name}」？所有腳本、素材與渲染輸出將一併刪除，無法復原。`))
          return;
        setBusy(true);
        await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
        router.push("/dashboard");
        router.refresh();
      }}
    >
      {busy ? "刪除中…" : "刪除專案"}
    </Button>
  );
}
