import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, setSessionCookie } from "@/lib/auth";

/**
 * 免登入 Demo 入口（規格 §4.1）：以預建的 demo 使用者建立 session，
 * 直接帶進森日茶研範例專案。
 */
export async function GET(req: Request) {
  const demoUser = await db.user.findUnique({ where: { email: "demo@clipforge.local" } });
  if (!demoUser) {
    return NextResponse.redirect(new URL("/?error=demo-missing", req.url));
  }
  await setSessionCookie(await createSession(demoUser.id));
  const project = await db.project.findFirst({
    where: { userId: demoUser.id },
    orderBy: { createdAt: "desc" },
  });
  const target = project ? `/projects/${project.id}` : "/dashboard";
  return NextResponse.redirect(new URL(target, req.url));
}
