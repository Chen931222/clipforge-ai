"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input, Textarea } from "./ui";

export interface BrandFormValues {
  id?: string;
  name: string;
  industry: string;
  description: string;
  audience: string;
  tone: string;
  defaultCta: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  logoUrl: string | null;
  websiteUrl: string | null;
}

const EMPTY: BrandFormValues = {
  name: "",
  industry: "",
  description: "",
  audience: "",
  tone: "",
  defaultCta: "",
  primaryColor: "#35544A",
  secondaryColor: "#F4EFE6",
  textColor: "#FFFFFF",
  logoUrl: null,
  websiteUrl: null,
};

export function BrandForm({ initial }: { initial?: BrandFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState<BrandFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof BrandFormValues, v: string | null) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const isEdit = Boolean(initial?.id);
    const res = await fetch(isEdit ? `/api/brands/${initial!.id}` : "/api/brands", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...values, id: undefined }),
    });
    if (res.ok) {
      router.push("/brands");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "儲存失敗，請再試一次");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="品牌名稱">
          <Input value={values.name} onChange={(e) => set("name", e.target.value)} required maxLength={60} />
        </Field>
        <Field label="產業">
          <Input value={values.industry} onChange={(e) => set("industry", e.target.value)} placeholder="例：茶飲食品" />
        </Field>
      </div>
      <Field label="品牌簡介">
        <Textarea value={values.description} onChange={(e) => set("description", e.target.value)} maxLength={600} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="目標客群">
          <Input value={values.audience} onChange={(e) => set("audience", e.target.value)} placeholder="例：25–45 歲上班族" />
        </Field>
        <Field label="品牌語氣">
          <Input value={values.tone} onChange={(e) => set("tone", e.target.value)} placeholder="例：溫暖、內斂、有質感" />
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="主要 CTA">
          <Input value={values.defaultCta} onChange={(e) => set("defaultCta", e.target.value)} placeholder="例：立即預購" />
        </Field>
        <Field label="官網 URL">
          <Input
            value={values.websiteUrl ?? ""}
            onChange={(e) => set("websiteUrl", e.target.value || null)}
            placeholder="https://…"
          />
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-5">
        {(
          [
            ["primaryColor", "主色"],
            ["secondaryColor", "輔色"],
            ["textColor", "文字色"],
          ] as const
        ).map(([key, label]) => (
          <Field key={key} label={label}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={values[key]}
                onChange={(e) => set(key, e.target.value)}
                aria-label={label}
              />
              <span className="font-mono text-xs text-ink-60">{values[key]}</span>
            </div>
          </Field>
        ))}
      </div>
      <Field
        label="Logo URL"
        hint="可貼上圖片網址；Demo 品牌使用 /demo/logo.svg。之後可換成上傳的素材網址。"
      >
        <Input
          value={values.logoUrl ?? ""}
          onChange={(e) => set("logoUrl", e.target.value || null)}
          placeholder="/demo/logo.svg 或 https://…"
        />
      </Field>
      {error ? <p className="text-sm text-rec">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "儲存中…" : initial?.id ? "儲存變更" : "建立品牌"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  );
}
