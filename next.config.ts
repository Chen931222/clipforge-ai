import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remotion 的 renderer/bundler 只在獨立 worker process 使用；
  // 這裡把它們排除在 Next server bundle 之外，避免 webpack 打包原生模組。
  serverExternalPackages: [
    "@remotion/bundler",
    "@remotion/renderer",
    "@prisma/client",
  ],
};

export default nextConfig;
