"use client";

import { useState } from "react";
import { pick } from "@/lib/i18n";

export function CopyButton({
  text,
  label = pick("複製", "Copy"),
  projectId,
}: {
  text: string;
  label?: string;
  /** 提供時回報匿名 copy 事件（付費訊號分析） */
  projectId?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-[4px] border border-rule px-2 py-1 font-mono text-[11px] text-ink-60 transition-colors hover:border-ink hover:text-ink"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
        if (projectId) {
          fetch("/api/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ kind: "copy", projectId }),
          }).catch(() => {});
        }
      }}
    >
      {copied ? pick("已複製 ✓", "Copied ✓") : label}
    </button>
  );
}
