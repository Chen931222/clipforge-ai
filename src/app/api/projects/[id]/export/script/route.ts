import { withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import {
  getOwnedProject,
  parseScenes,
  parseSocialCopy,
  parseStrategy,
} from "@/lib/models";
import { projectScriptMarkdown } from "@/lib/exporters";
import { recordExportEvent } from "@/lib/events";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrorHandling<Ctx>(async (_req, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const project = await getOwnedProject(user.id, id);
  const md = projectScriptMarkdown(
    project.name,
    project.brand.name,
    parseStrategy(project.strategyJson),
    project.videos.map((v) => ({
      title: v.title,
      type: v.type,
      aspectRatio: v.aspectRatio,
      scenes: parseScenes(v.scenesJson),
      socialCopy: v.type === "master" ? parseSocialCopy(v.socialCopyJson) : null,
    })),
  );
  recordExportEvent("script", id);
  return new Response(md, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="script-${id}.md"`,
    },
  });
});
