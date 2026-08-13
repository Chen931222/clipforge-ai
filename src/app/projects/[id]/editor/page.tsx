import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageTitle, buttonClass } from "@/components/ui";
import { SceneEditor } from "@/components/scene-editor";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { pick } from "@/lib/i18n";
import { parseScenes } from "@/lib/models";

export const metadata = { title: pick("場景編輯器 — ClipForge AI", "Scene editor — ClipForge AI") };
export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ video?: string }>;
}) {
  const user = await getSessionUser();
  const { id } = await params;
  const { video: videoParam } = await searchParams;
  const project = user
    ? await db.project.findFirst({
        where: { id, userId: user.id },
        include: {
          brand: true,
          assets: { orderBy: { createdAt: "asc" } },
          videos: { orderBy: { createdAt: "asc" } },
        },
      })
    : null;
  if (!project) notFound();

  if (project.videos.length === 0) {
    return (
      <AppShell>
        <PageTitle kicker={project.brand.name} title={pick("場景編輯器", "Scene editor")} />
        <div className="rounded-md border border-rule bg-sheet p-10 text-center">
          <p className="font-serif text-xl font-semibold">{pick("還沒有影片腳本", "No video scripts yet")}</p>
          <p className="mt-2 text-sm text-ink-60">{pick("先在專案頁生成企劃，就會得到主影片與短影音的場景腳本。", "Generate a plan on the project page to get scene scripts for the master video and the short-form cuts.")}</p>
          <div className="mt-6">
            <Link href={`/projects/${project.id}`} className={buttonClass("primary")}>
              {pick("回專案頁", "Back to project")}
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const videos = project.videos.map((v) => ({
    id: v.id,
    type: v.type,
    title: v.title,
    aspectRatio: v.aspectRatio,
    subtitleStyle: v.subtitleStyle,
    status: v.status,
    scenes: parseScenes(v.scenesJson),
  }));
  const active =
    videos.find((v) => v.id === videoParam) ?? videos.find((v) => v.type === "master") ?? videos[0];

  return (
    <AppShell>
      <PageTitle
        kicker={`${project.brand.name}・${project.name}`}
        title={pick("場景編輯器", "Scene editor")}
        actions={
          <Link href={`/projects/${project.id}/renders`} className={buttonClass("secondary")}>
            {pick("渲染與匯出", "Render & export")}
          </Link>
        }
      />
      <SceneEditor
        key={active.id}
        projectId={project.id}
        videos={videos}
        activeVideoId={active.id}
        assets={project.assets.map((a) => ({
          id: a.id,
          originalName: a.originalName,
          storageUrl: a.storageUrl,
          type: a.type,
        }))}
        brand={{
          name: project.brand.name,
          primaryColor: project.brand.primaryColor,
          secondaryColor: project.brand.secondaryColor,
          textColor: project.brand.textColor,
          logoUrl: project.brand.logoUrl,
        }}
      />
    </AppShell>
  );
}
