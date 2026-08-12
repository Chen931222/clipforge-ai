import { db } from "@/lib/db";
import { jsonError, jsonOk, withErrorHandling } from "@/lib/api";
import { createSession, hashPassword, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validation";

export const POST = withErrorHandling(async (req) => {
  const body = registerSchema.parse(await req.json());
  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) return jsonError("conflict", 409, "這個 Email 已經註冊過了");
  const user = await db.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash: await hashPassword(body.password),
    },
  });
  await setSessionCookie(await createSession(user.id));
  return jsonOk({ id: user.id, email: user.email, name: user.name }, { status: 201 });
});
