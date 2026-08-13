import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "var/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      // demo 網站的建置產物（壓縮過的 bundle，不是原始碼）
      "demo-en/clipforge-demo/**",
      "demo-en/dist/**",
    ],
  },
  {
    // demo-en 是獨立的 Vite 應用，不在 Next 裡跑，next/image 的規則不適用
    files: ["demo-en/**/*.tsx"],
    rules: { "@next/next/no-img-element": "off" },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default eslintConfig;
