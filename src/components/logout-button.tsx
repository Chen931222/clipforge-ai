"use client";

import { useRouter } from "next/navigation";
import { pick } from "@/lib/i18n";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="text-sm text-ink-60 underline-offset-4 hover:text-ink hover:underline"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      {pick("登出", "Log out")}
    </button>
  );
}
