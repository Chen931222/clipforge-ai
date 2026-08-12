import { db } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { createSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req) => {
  const body = loginSchema.parse(await req.json());
  const user = await db.user.findUnique({ where: { email: body.email } });
  if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
    return jsonError("unauthorized", 401, "Email 或密碼不正確");
  }
  await setSessionCookie(await createSession(user.id));
  return jsonOk({ id: user.id, email: user.email, name: user.name });
});
