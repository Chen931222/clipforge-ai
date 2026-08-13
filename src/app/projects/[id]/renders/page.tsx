import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageTitle, buttonClass } from "@/components/ui";
import { CopyButton } from "@/components/copy-button";
import { RenderCenter } from "@/components/render-center";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pick } from "@/lib/i18n";
import { parseScenes, parseSocialCopy } from "@/lib/models";

export const metadata = { title: pick("渲染與匯出 — ClipForge AI", "Render & Export — ClipForge AI") };
export const dynamic = "force-dynamic";

export default async function RendersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;
  const project = user
    ? await db.project.findFirst({
        where: { id, userId: user.id },
        include: {
          brand: true,
          videos: {
            orderBy: { createdAt: "asc" },
            include: { renderJobs: { orderBy: { createdAt: "desc" }, take: 1 } },
          },
        },
      })
    : null;
  if (!project) notFound();

  const master = project.videos.find((v) => v.type === "master");
  const socialCopy = master ? parseSocialCopy(master.socialCopyJson) : null;

  return (
    <AppShell>
      <PageTitle
        kicker={`${project.brand.name}・${project.name}`}
        title={pick("渲染與匯出", "Render & Export")}
        actions={
          <Link href={`/projects/${project.id}/editor`} className={buttonClass("secondary")}>
            {pick("回編輯器", "Back to editor")}
          </Link>
        }
      />
      {project.videos.length === 0 ? (
        <div className="rounded-md border border-rule bg-sheet p-10 text-center">
          <p className="font-serif text-xl font-semibold">
            {pick("還沒有影片可渲染", "No videos to render yet")}
          </p>
          <p className="mt-2 text-sm text-ink-60">
            {pick("先在專案頁生成企劃與腳本。", "Generate the plan and scripts on the project page first.")}
          </p>
          <div className="mt-6">
            <Link href={`/projects/${project.id}`} className={buttonClass("primary")}>
              {pick("回專案頁", "Back to project")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <RenderCenter
            projectId={project.id}
            initialVideos={project.videos.map((v) => ({
              id: v.id,
              type: v.type,
              title: v.title,
              aspectRatio: v.aspectRatio,
              duration: v.duration,
              sceneCount: parseScenes(v.scenesJson).length,
              status: v.status,
              latestJob: v.renderJobs[0]
                ? {
                    id: v.renderJobs[0].id,
                    status: v.renderJobs[0].status,
                    progress: v.renderJobs[0].progress,
                    outputUrl: v.renderJobs[0].outputUrl,
                    errorMessage: v.renderJobs[0].errorMessage,
                  }
                : null,
            }))}
          />
          {socialCopy ? (
            <section className="mt-10">
              <h2 className="mb-3 font-serif text-xl font-semibold">
                {pick("社群文案快速複製", "Social copy")}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {(
                  [
                    ["YouTube", `${socialCopy.youtubeTitle}\n\n${socialCopy.youtubeDescription}`],
                    ["Instagram", socialCopy.instagram],
                    ["Facebook", socialCopy.facebook],
                    ["TikTok", socialCopy.tiktok],
                  ] as const
                ).map(([label, text]) => (
                  <div key={label} className="rounded-md border border-rule bg-sheet p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] tracking-widest text-ink-40">
                        {label.toUpperCase()}
                      </span>
                      <CopyButton projectId={project.id} text={text} />
                    </div>
                    <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm text-ink-60">{text}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </AppShell>
  );
}
