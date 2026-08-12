"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { OBJECTIVE_LABELS, STYLE_LABELS } from "@/lib/ai/schemas";
import { Button, Field, Input, Select, Textarea } from "./ui";

export function ProjectForm({
  brands,
}: {
  brands: { id: string; name: string; defaultCta: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [points, setPoints] = useState<string[]>(["", "", ""]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!rightsConfirmed) {
      setError("請先勾選素材版權確認");
      return;
    }
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: String(form.get("name") ?? ""),
        brandId: String(form.get("brandId") ?? ""),
        productName: String(form.get("productName") ?? ""),
        productDescription: String(form.get("productDescription") ?? ""),
        objective: String(form.get("objective") ?? "promotion"),
        audience: String(form.get("audience") ?? ""),
        sellingPoints: points.map((p) => p.trim()).filter(Boolean),
        cta: String(form.get("cta") ?? ""),
        language: String(form.get("language") ?? "zh-TW"),
        style: String(form.get("style") ?? "warm"),
        masterDuration: Number(form.get("masterDuration") ?? 90),
        shortVideoCount: Number(form.get("shortVideoCount") ?? 3),
      }),
    });
    if (res.ok) {
      const { data } = await res.json();
      router.push(`/projects/${data.id}`);
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "建立失敗，請再試一次");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="專案名稱">
          <Input name="name" required maxLength={80} placeholder="例：冷泡烏龍茶禮盒 上市企劃" />
        </Field>
        <Field label="品牌">
          <Select name="brandId" required defaultValue={brands[0]?.id}>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="產品／服務名稱">
          <Input name="productName" required maxLength={60} />
        </Field>
        <Field label="目標受眾" hint="留空則沿用品牌的目標客群">
          <Input name="audience" maxLength={200} />
        </Field>
      </div>
      <Field label="產品介紹" hint="AI 只會使用這裡提供的事實，不會捏造功能與數據">
        <Textarea name="productDescription" maxLength={2000} rows={4} />
      </Field>
      <Field label="主要賣點（最多五項）">
        <div className="grid gap-2">
          {points.map((p, i) => (
            <Input
              key={i}
              value={p}
              maxLength={60}
              placeholder={`賣點 ${i + 1}`}
              onChange={(e) =>
                setPoints((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))
              }
            />
          ))}
          {points.length < 5 ? (
            <Button type="button" variant="ghost" onClick={() => setPoints((p) => [...p, ""])}>
              ＋ 新增賣點
            </Button>
          ) : null}
        </div>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="影片目的">
          <Select name="objective" defaultValue="promotion">
            {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="風格">
          <Select name="style" defaultValue="warm">
            {Object.entries(STYLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="CTA">
          <Input name="cta" maxLength={60} placeholder="留空沿用品牌 CTA" />
        </Field>
        <Field label="影片語言">
          <Select name="language" defaultValue="zh-TW">
            <option value="zh-TW">繁體中文</option>
            <option value="en">英文</option>
          </Select>
        </Field>
        <Field label="主影片長度">
          <Select name="masterDuration" defaultValue="90">
            <option value="60">60 秒</option>
            <option value="90">90 秒</option>
            <option value="120">120 秒</option>
          </Select>
        </Field>
      </div>
      <Field label="短影音數量">
        <Select name="shortVideoCount" defaultValue="3" className="max-w-40">
          {[3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n} 支
            </option>
          ))}
        </Select>
      </Field>
      <label className="flex items-start gap-2 text-sm text-ink-60">
        <input
          type="checkbox"
          checked={rightsConfirmed}
          onChange={(e) => setRightsConfirmed(e.target.checked)}
          className="mt-1"
        />
        <span>
          我確認擁有將上傳素材的使用權；若內容涉及真人影像或聲音，我已（或將）取得當事人授權。
        </span>
      </label>
      {error ? <p className="text-sm text-rec">{error}</p> : null}
      <div className="flex gap-3">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? "建立中…" : "建立專案"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  );
}
