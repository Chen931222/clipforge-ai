/**
 * mock provider 只用 node:crypto 的 randomUUID 產生場景 id。
 * 瀏覽器原生就有（secure context：localhost 與 https 都算）。
 */
export function randomUUID(): string {
  return crypto.randomUUID();
}
