/**
 * 兩語系開關。
 *
 * 語系在「build 時」由 NEXT_PUBLIC_LOCALE 決定，執行期不切換：
 * 沒設或不是 "en" 就是繁體中文，繁中永遠是預設。
 * NEXT_PUBLIC_ 前綴會被 Next 內聯進 server 與 client 兩份 bundle，
 * 所以 pick() 在 server component 和 "use client" 元件裡都能直接呼叫，
 * 不需要 context provider，也不必一路傳 prop。
 *
 * 為什麼用 pick() 而不是 message key 字典：
 * - 字串留在使用它的地方，讀 code 當場看得到兩種語言，不用跳檔對照 key。
 * - diff 只落在真正改到的那一行，review 成本低。
 * - 沒有共用的翻譯檔，多人同時改不同檔案不會互相卡住。
 *
 * 這是務實的兩語系解法，不是完整的 i18n 基礎建設：
 * 不支援執行期切換、複數規則、日期與數字在地化。
 * 之後若語系超過兩種、或要讓使用者自行切換，再抽換掉這一層。
 */

export type Locale = "zh-TW" | "en";

export const LOCALE: Locale = process.env.NEXT_PUBLIC_LOCALE === "en" ? "en" : "zh-TW";

/** 依語系挑字串：zh 是預設，en 只在 NEXT_PUBLIC_LOCALE=en 時生效。 */
export function pick<T>(zh: T, en: T): T {
  return LOCALE === "en" ? en : zh;
}
