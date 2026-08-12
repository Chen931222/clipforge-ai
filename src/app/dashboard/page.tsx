import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { PageTitle, StatusStamp, buttonClass } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "作業檯 — ClipForge AI" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  const projects = user
    ? await db.project.findMany({
        where: { userId: user.id },
        include: { brand: true, videos: { select: { id: true, status: true } } },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const brandCount = user ? await db.brand.count({ where: { userId: user.id } }) : 0;

  return (
    <AppShell>
      <PageTitle
        kicker="PRODUCTION DESK"
        title="作業檯"
        actions={
          <>
            <Link href="/brands/new" className={buttonClass("secondary")}>
              新品牌
            </Link>
            <Link
              href="/projects/new"
              className={buttonClass(brandCount > 0 ? "primary" : "secondary")}
            >
              新內容專案
            </Link>
          </>
        }
      />

      {projects.length === 0 ? (
        <div className="rounded-md border border-rule bg-sheet p-10 text-center">
          <p className="font-serif text-xl font-semibold">還沒有任何專案</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-60">
            {brandCount === 0
              ? "先建立一個品牌（名稱、色彩、語氣與 CTA），再開內容專案。"
              : "開一個內容專案，上傳素材後讓 AI 生成企劃與腳本。"}
          </p>
          <div className="mt-6">
            <Link
              href={brandCount === 0 ? "/brands/new" : "/projects/new"}
              className={buttonClass("primary")}
            >
              {brandCount === 0 ? "建立第一個品牌" : "建立內容專案"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-rule bg-sheet">
          <table className="cue-table min-w-[640px]">
            <thead>
              <tr>
                <th>專案</th>
                <th>品牌</th>
                <th>影片</th>
                <th>狀態</th>
                <th>更新</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link
                      href={`/projects/${p.id}`}
                      className="font-serif text-base font-semibold hover:underline underline-offset-4"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-ink-40">{p.productName}</div>
                  </td>
                  <td className="text-sm">{p.brand.name}</td>
                  <td className="font-mono text-xs">{p.videos.length} 支</td>
                  <td>
                    <StatusStamp status={p.status} />
                  </td>
                  <td className="font-mono text-xs text-ink-40">
                    {p.updatedAt.toLocaleDateString("zh-TW")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
