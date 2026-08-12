import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageTitle, buttonClass } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseStrategy } from "@/lib/models";

export const metadata = { title: "內容策略 — ClipForge AI" };
export const dynamic = "force-dynamic";

export default async function StrategyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;
  const project = user
    ? await db.project.findFirst({
        where: { id, userId: user.id },
        include: { brand: true },
      })
    : null;
  if (!project) notFound();
  const strategy = parseStrategy(project.strategyJson);

  if (!strategy) {
    return (
      <AppShell>
        <PageTitle kicker={project.brand.name} title="內容策略" />
        <div className="rounded-md border border-rule bg-sheet p-10 text-center">
          <p className="font-serif text-xl font-semibold">還沒有生成企劃</p>
          <p className="mt-2 text-sm text-ink-60">回到專案頁，讓 AI 生成內容策略與腳本。</p>
          <div className="mt-6">
            <Link href={`/projects/${project.id}`} className={buttonClass("primary")}>
              回專案頁
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const copy = strategy.socialCopy;
  const platforms: { key: string; label: string; text: string }[] = [
    {
      key: "youtube",
      label: "YouTube",
      text: `${copy.youtubeTitle}\n\n${copy.youtubeDescription}`,
    },
    { key: "instagram", label: "Instagram", text: copy.instagram },
    { key: "facebook", label: "Facebook", text: copy.facebook },
    { key: "tiktok", label: "TikTok", text: copy.tiktok },
  ];

  return (
    <AppShell>
      <PageTitle
        kicker={`${project.brand.name}・${project.name}`}
        title="內容策略"
        actions={
          <>
            <Link href={`/projects/${project.id}/editor`} className={buttonClass("secondary")}>
              場景編輯器
            </Link>
            <Link href={`/projects/${project.id}/renders`} className={buttonClass("primary")}>
              渲染與匯出
            </Link>
          </>
        }
      />

      {strategy.complianceNote ? (
        <div className="mb-6 rounded-md border border-rec bg-sheet p-4 text-sm text-rec">
          ⚠ {strategy.complianceNote}
        </div>
      ) : null}

      <section className="mb-10">
        <div className="rounded-md border border-ink bg-sheet p-6">
          <div className="font-mono text-[11px] tracking-widest text-ink-40">一句話策略</div>
          <p className="mt-2 font-serif text-2xl font-semibold leading-snug">
            {strategy.strategyOneLiner}
          </p>
        </div>
      </section>

      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold">受眾痛點</h2>
          <ul>
            {strategy.painPoints.map((p, i) => (
              <li key={i} className="flex gap-3 border-b border-rule py-3 text-sm">
                <span className="font-mono text-xs text-ink-40">P{i + 1}</span>
                {p}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-serif text-xl font-semibold">核心訊息</h2>
          <ul>
            {strategy.coreMessages.map((m, i) => (
              <li key={i} className="flex gap-3 border-b border-rule py-3 text-sm">
                <span className="font-mono text-xs text-ink-40">M{i + 1}</span>
                {m}
              </li>
            ))}
          </ul>
        </section>
      </div>

      {strategy.needsConfirmation.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-xl font-semibold">待確認事項</h2>
          <ul className="grid gap-2">
            {strategy.needsConfirmation.map((n, i) => (
              <li
                key={i}
                className="rounded-md border border-rule bg-paper px-4 py-3 text-sm text-ink-60"
              >
                ▢ {n}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="mb-3 font-serif text-xl font-semibold">短影音企劃</h2>
        <div className="overflow-x-auto rounded-md border border-rule bg-sheet">
          <table className="cue-table min-w-[560px]">
            <thead>
              <tr>
                <th>片名</th>
                <th>Hook</th>
                <th>CTA</th>
                <th>秒數</th>
              </tr>
            </thead>
            <tbody>
              {strategy.shorts.map((s, i) => (
                <tr key={i}>
                  <td className="text-sm font-medium">{s.title}</td>
                  <td className="text-sm text-ink-60">{s.hook}</td>
                  <td className="text-sm">{s.cta}</td>
                  <td className="font-mono text-xs">{s.durationSec}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 font-serif text-xl font-semibold">社群文案</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {platforms.map((p) => (
            <div key={p.key} className="rounded-md border border-rule bg-sheet p-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] tracking-widest text-ink-40">
                  {p.label.toUpperCase()}
                </span>
                <CopyButton projectId={project.id} text={p.text} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{p.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-widest text-ink-40">HASHTAGS</span>
          <span className="text-sm text-ink-60">{copy.hashtags.map((h) => `#${h}`).join(" ")}</span>
          <CopyButton projectId={project.id} text={copy.hashtags.map((h) => `#${h}`).join(" ")} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-widest text-ink-40">縮圖標題</span>
          {copy.thumbnailTitles.map((t, i) => (
            <span key={i} className="rounded-full border border-rule px-3 py-1 text-sm">
              {t}
            </span>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
