import type { Metadata } from "next";
import { Chivo_Mono, Noto_Sans_TC, Noto_Serif_TC } from "next/font/google";
import { pick } from "@/lib/i18n";
import "./globals.css";

const notoSerif = Noto_Serif_TC({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-noto-serif",
});

const notoSans = Noto_Sans_TC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans",
});

const chivoMono = Chivo_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-chivo-mono",
});

export const metadata: Metadata = {
  title: pick(
    "ClipForge AI — 一份素材，完成主影片、短影音與整月社群內容",
    "ClipForge AI — one upload, a month of content",
  ),
  description: pick(
    "上傳產品資料，AI 幫你完成企劃、腳本、配音、字幕與影片輸出。",
    "Upload your product details. AI writes the plan, script, voiceover and subtitles, then renders the video.",
  ),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang={pick("zh-Hant-TW", "en")}>
      <body
        className={`${notoSerif.variable} ${notoSans.variable} ${chivoMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
