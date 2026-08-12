import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { jsonOk, withErrorHandling } from "@/lib/api";
import { SESSION_COOKIE, clearSessionCookie } from "@/lib/auth";

export const POST = withErrorHandling(async () => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { id: token } });
  }
  await clearSessionCookie();
  return jsonOk({ ok: true });
});
