import { AppShell } from "@/components/app-shell";
import { PageTitle } from "@/components/ui";
import { getSessionUser } from "@/lib/auth";
import { exportStats } from "@/lib/events";

const KIND_LABELS: Record<string, string> = {
  mp4: "影片 MP4",
  copy: "社群文案複製",
  srt: "SRT 字幕",
  script: "Markdown 腳本",
  json: "專案 JSON",
};

export const metadata = { title: "設定 — ClipForge AI" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  const aiProvider = process.env.AI_PROVIDER ?? "mock";
  const aiActive =
    aiProvider === "anthropic" && process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock";
  const ttsProvider = process.env.TTS_PROVIDER ?? "mock";
  const storage = process.env.STORAGE_PROVIDER ?? "local";
  const stats = await exportStats();

  return (
    <AppShell>
      <PageTitle kicker="SETTINGS" title="設定" />
      <div className="grid max-w-2xl gap-6">
        <section className="rounded-md border border-rule bg-sheet p-5">
          <h2 className="font-serif text-lg font-semibold">帳號</h2>
          <table className="cue-table mt-3">
            <tbody>
              <tr>
                <td className="w-28 font-mono text-xs text-ink-40">名稱</td>
                <td className="text-sm">{user?.name}</td>
              </tr>
              <tr>
                <td className="font-mono text-xs text-ink-40">Email</td>
                <td className="text-sm">{user?.email}</td>
              </tr>
              <tr>
                <td className="font-mono text-xs text-ink-40">身分</td>
                <td className="text-sm">{user?.isDemo ? "Demo 帳號（所有人共用）" : "一般帳號"}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-md border border-rule bg-sheet p-5">
          <h2 className="font-serif text-lg font-semibold">服務供應商</h2>
          <p className="mt-1 text-xs text-ink-40">
            由伺服器環境變數控制（.env），API Key 不會出現在瀏覽器端。
          </p>
          <table className="cue-table mt-3">
            <tbody>
              <tr>
                <td className="w-28 font-mono text-xs text-ink-40">AI</td>
                <td className="text-sm">
                  {aiActive === "anthropic" ? "Anthropic（已設定金鑰）" : "Mock（不需金鑰）"}
                  {aiProvider === "anthropic" && aiActive === "mock" ? (
                    <span className="ms-2 text-rec">設定為 anthropic 但缺金鑰，已退回 mock</span>
                  ) : null}
                </td>
              </tr>
              <tr>
                <td className="font-mono text-xs text-ink-40">TTS</td>
                <td className="text-sm">
                  {ttsProvider === "mock"
                    ? "Mock 音軌（節奏對位）"
                    : ttsProvider === "edge"
                      ? "Edge 朗讀（真中文語音；非官方端點，僅限展示，失敗自動退回 mock）"
                      : ttsProvider}
                </td>
              </tr>
              <tr>
                <td className="font-mono text-xs text-ink-40">儲存</td>
                <td className="text-sm">{storage === "local" ? "本機 var/（開發用）" : storage}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="rounded-md border border-rule bg-sheet p-5">
          <h2 className="font-serif text-lg font-semibold">匯出行為統計</h2>
          <p className="mt-1 text-xs text-ink-40">
            匿名事件計數（不記使用者），用來觀察客戶實際拿走哪種輸出。
          </p>
          <table className="cue-table mt-3">
            <thead>
              <tr>
                <th>輸出</th>
                <th>近 7 天</th>
                <th>累計</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.kind}>
                  <td className="text-sm">{KIND_LABELS[s.kind] ?? s.kind}</td>
                  <td className="font-mono text-xs">{s.last7d}</td>
                  <td className="font-mono text-xs">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-md border border-rule bg-sheet p-5 text-sm text-ink-60">
          <h2 className="font-serif text-lg font-semibold text-ink">授權提醒</h2>
          <p className="mt-2">
            上傳素材前請確認擁有使用權；若內容涉及真人影像或聲音，需事先取得當事人授權。
            本工具不提供人臉複製、聲音克隆或未經授權的數字分身。
          </p>
        </section>
      </div>
    </AppShell>
  );
}
