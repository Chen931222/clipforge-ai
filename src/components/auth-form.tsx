"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Field, Input } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const body: Record<string, string> = {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    };
    if (mode === "register") body.name = String(form.get("name") ?? "");
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => null);
    setError(data?.error?.message ?? "發生錯誤，請再試一次");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {mode === "register" ? (
        <Field label="名稱">
          <Input name="name" required maxLength={60} placeholder="你的名字或團隊名稱" />
        </Field>
      ) : null}
      <Field label="Email">
        <Input name="email" type="email" required placeholder="you@example.com" />
      </Field>
      <Field label="密碼" hint={mode === "register" ? "至少 8 碼" : undefined}>
        <Input name="password" type="password" required minLength={mode === "register" ? 8 : 1} />
      </Field>
      {error ? <p className="text-sm text-rec">{error}</p> : null}
      <Button type="submit" variant="primary" disabled={busy}>
        {busy ? "處理中…" : mode === "login" ? "登入" : "建立帳號"}
      </Button>
      <p className="text-sm text-ink-60">
        {mode === "login" ? (
          <>
            還沒有帳號？{" "}
            <Link href="/register" className="text-ink underline underline-offset-4">
              註冊
            </Link>
            ，或先{" "}
            <Link href="/demo" className="text-ink underline underline-offset-4">
              試玩 Demo
            </Link>
          </>
        ) : (
          <>
            已經有帳號？{" "}
            <Link href="/login" className="text-ink underline underline-offset-4">
              登入
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
