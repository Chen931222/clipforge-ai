import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { PageTitle, StatusStamp, buttonClass } from "@/components/ui";
import {
  AssetUploader,
  DeleteProjectButton,
  GenerateButton,
} from "@/components/project-actions";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { OBJECTIVE_LABELS, STYLE_LABELS } from "@/lib/ai/schemas";
import { parseSellingPoints, parseScenes } from "@/lib/models";
import { formatTimecode } from "@/lib/srt";

export const metadata = { title: "專案 — ClipForge AI" };
export const dynamic = "force-dynamic";

export default async function ProjectPage({
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
          assets: { orderBy: { createdAt: "asc" } },
          videos: { orderBy: { createdAt: "asc" } },
        },
      })
    : null;
  if (!project) notFound();

  const sellingPoints = parseSellingPoints(project.sellingPointsJson);
  const hasStrategy = Boolean(project.strategyJson);
  const master = project.videos.find((v) => v.type === "master");

  const inputsSummary = [
    `品牌：${project.brand.name}（語氣：${project.brand.tone || "未填"}）`,
    `產品：${project.productName}`,
    `目的：${OBJECTIVE_LABELS[project.objective as keyof typeof OBJECTIVE_LABELS] ?? project.objective}｜風格：${STYLE_LABELS[project.style as keyof typeof STYLE_LABELS] ?? project.style}`,
    `賣點 ${sellingPoints.length} 項｜素材 ${project.assets.length} 件`,
    `主影片 ${project.masterDuration} 秒＋短影音 ${project.shortVideoCount} 支`,
  ];

  return (
    <AppShell>
      <PageTitle
        kicker={`${project.brand.name}・${OBJECTIVE_LABELS[project.objective as keyof typeof OBJECTIVE_LABELS] ?? project.objective}`}
        title={project.name}
        actions={
          <>
            <StatusStamp status={project.status} />
            {hasStrategy ? (
              <>
                <Link href={`/projects/${project.id}/strategy`} className={buttonClass("secondary")}>
                  內容策略
                </Link>
                <Link href={`/projects/${project.id}/editor`} className={buttonClass("secondary")}>
                  場景編輯器
                </Link>
                <Link href={`/projects/${project.id}/renders`} className={buttonClass("primary")}>
                  渲染與匯出
                </Link>
              </>
            ) : null}
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold">專案設定</h2>
            <div className="overflow-hidden rounded-md border border-rule bg-sheet">
              <table className="cue-table">
                <tbody>
                  <tr>
                    <td className="w-28 font-mono text-xs text-ink-40">產品</td>
                    <td className="text-sm">{project.productName}</td>
                  </tr>
                  <tr>
                    <td className="font-mono text-xs text-ink-40">介紹</td>
                    <td className="text-sm text-ink-60">
                      {project.productDescription || "（未填）"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-xs text-ink-40">受眾</td>
                    <td className="text-sm">{project.audience || project.brand.audience || "（未填）"}</td>
                  </tr>
                  <tr>
                    <td className="font-mono text-xs text-ink-40">賣點</td>
                    <td className="text-sm">
                      {sellingPoints.length ? sellingPoints.join("、") : "（未填）"}
                    </td>
                  </tr>
                  <tr>
                    <td className="font-mono text-xs text-ink-40">CTA</td>
                    <td className="text-sm">{project.cta || project.brand.defaultCta || "（未填）"}</td>
                  </tr>
                  <tr>
                    <td className="font-mono text-xs text-ink-40">規格</td>
                    <td className="font-mono text-xs">
                      {project.language === "en" ? "EN" : "繁中"}・主片 {project.masterDuration}s・短片 ×
                      {project.shortVideoCount}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold">素材</h2>
            <AssetUploader
              projectId={project.id}
              assets={project.assets.map((a) => ({
                id: a.id,
                originalName: a.originalName,
                storageUrl: a.storageUrl,
                mimeType: a.mimeType,
              }))}
            />
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div>
            <h2 className="mb-3 font-serif text-xl font-semibold">AI 企劃</h2>
            <GenerateButton
              projectId={project.id}
              hasStrategy={hasStrategy}
              inputsSummary={inputsSummary}
            />
          </div>

          {project.videos.length > 0 ? (
            <div>
              <h2 className="mb-3 font-serif text-xl font-semibold">影片</h2>
              <div className="overflow-x-auto rounded-md border border-rule bg-sheet">
                <table className="cue-table min-w-[480px]">
                  <thead>
                    <tr>
                      <th>NO.</th>
                      <th>影片</th>
                      <th>規格</th>
                      <th>狀態</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.videos.map((v, i) => (
                      <tr key={v.id}>
                        <td className="font-mono text-xs text-ink-40">
                          R{String(i + 1).padStart(2, "0")}
                        </td>
                        <td>
                          <div className="text-sm font-medium">{v.title}</div>
                          <div className="font-mono text-[11px] text-ink-40">
                            {v.type === "master" ? "主影片" : "短影音"}・
                            {parseScenes(v.scenesJson).length} 場景
                          </div>
                        </td>
                        <td className="font-mono text-xs">
                          {v.aspectRatio}・{formatTimecode(v.duration)}
                        </td>
                        <td>
                          <StatusStamp status={v.status} />
                        </td>
                        <td>
                          <Link
                            href={`/projects/${project.id}/editor?video=${v.id}`}
                            className="text-sm underline underline-offset-4"
                          >
                            編輯
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {master ? null : (
                <p className="mt-2 text-xs text-ink-40">尚未生成主影片。</p>
              )}
            </div>
          ) : null}

          <div className="mt-auto border-t border-rule pt-6">
            <h2 className="mb-3 font-serif text-lg font-semibold text-ink-60">危險區</h2>
            <DeleteProjectButton projectId={project.id} name={project.name} />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
