import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageTitle, buttonClass } from "@/components/ui";
import { ProjectForm } from "@/components/project-form";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "新內容專案 — ClipForge AI" };
export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  const user = await getSessionUser();
  const brands = user
    ? await db.brand.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, defaultCta: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <AppShell>
      <PageTitle kicker="NEW PRODUCTION" title="建立內容專案" />
      {brands.length === 0 ? (
        <div className="rounded-md border border-rule bg-sheet p-10 text-center">
          <p className="font-serif text-xl font-semibold">先建立品牌</p>
          <p className="mt-2 text-sm text-ink-60">專案需要掛在品牌底下，才能沿用色彩、語氣與 CTA。</p>
          <div className="mt-6">
            <Link href="/brands/new" className={buttonClass("primary")}>
              建立品牌
            </Link>
          </div>
        </div>
      ) : (
        <ProjectForm brands={brands} />
      )}
    </AppShell>
  );
}
