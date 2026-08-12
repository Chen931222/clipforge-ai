import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageTitle, buttonClass } from "@/components/ui";
import { SceneEditor } from "@/components/scene-editor";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseScenes } from "@/lib/models";

export const metadata = { title: "場景編輯器 — ClipForge AI" };
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
        <PageTitle kicker={project.brand.name} title="場景編輯器" />
        <div className="rounded-md border border-rule bg-sheet p-10 text-center">
          <p className="font-serif text-xl font-semibold">還沒有影片腳本</p>
          <p className="mt-2 text-sm text-ink-60">先在專案頁生成企劃，就會得到主影片與短影音的場景腳本。</p>
          <div className="mt-6">
            <Link href={`/projects/${project.id}`} className={buttonClass("primary")}>
              回專案頁
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
        title="場景編輯器"
        actions={
          <Link href={`/projects/${project.id}/renders`} className={buttonClass("secondary")}>
            渲染與匯出
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
