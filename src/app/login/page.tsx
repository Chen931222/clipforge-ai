import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "登入 — ClipForge AI" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-16">
      <Link href="/" className="mb-8 flex items-baseline gap-2">
        <span className="font-serif text-xl font-bold">ClipForge</span>
        <span className="font-mono text-xs tracking-widest text-rec">AI</span>
      </Link>
      <h1 className="mb-6 font-serif text-2xl font-semibold">登入</h1>
      <AuthForm mode="login" />
    </div>
  );
}
