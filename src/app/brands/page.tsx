import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageTitle, buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "品牌 — ClipForge AI" };
export const dynamic = "force-dynamic";

export default async function BrandsPage() {
  const user = await getSessionUser();
  const brands = user
    ? await db.brand.findMany({
        where: { userId: user.id },
        include: { _count: { select: { projects: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <AppShell>
      <PageTitle
        kicker="BRAND BOOK"
        title="品牌"
        actions={
          <Link href="/brands/new" className={buttonClass("primary")}>
            新品牌
          </Link>
        }
      />
      {brands.length === 0 ? (
        <div className="rounded-md border border-rule bg-sheet p-10 text-center">
          <p className="font-serif text-xl font-semibold">還沒有品牌</p>
          <p className="mt-2 text-sm text-ink-60">品牌設定會被記住：語氣、色彩與 CTA 讓後續內容保持一致。</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/brands/${b.id}`}
              className="group rounded-md border border-rule bg-sheet p-5 transition-colors hover:border-ink"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="font-serif text-lg font-semibold group-hover:underline underline-offset-4">
                  {b.name}
                </div>
                <div className="flex gap-1.5" aria-hidden>
                  {[b.primaryColor, b.secondaryColor, b.textColor].map((c, i) => (
                    <span
                      key={i}
                      className="h-4 w-4 rounded-full border border-rule"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-1 text-sm text-ink-60">{b.industry || "未填產業"}</div>
              <div className="mt-3 font-mono text-xs text-ink-40">
                {b._count.projects} 個專案｜CTA：{b.defaultCta || "—"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
