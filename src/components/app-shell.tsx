import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

/** 登入後頁面外框：通告單式頁首＋內容欄。未登入導回 /login。 */
export async function AppShell({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink bg-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/dashboard" className="flex items-baseline gap-2">
            <span className="font-serif text-lg font-bold">ClipForge</span>
            <span className="font-mono text-[11px] tracking-widest text-rec">AI</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard" className="hover:underline underline-offset-4">
              作業檯
            </Link>
            <Link href="/brands" className="hover:underline underline-offset-4">
              品牌
            </Link>
            <Link href="/settings" className="hover:underline underline-offset-4">
              設定
            </Link>
          </nav>
          <div className="ms-auto flex items-center gap-3 text-sm text-ink-60">
            <span className="hidden sm:inline">
              {user.name}
              {user.isDemo ? (
                <span className="ms-2 rounded-full border border-rule px-2 py-0.5 font-mono text-[11px]">
                  DEMO
                </span>
              ) : null}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">{children}</main>
    </div>
  );
}
