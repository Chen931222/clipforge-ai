import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

/** 一致的 API 錯誤格式：{ error: { code, message } }。不洩漏堆疊或供應商內部錯誤。 */
export function jsonError(code: string, status: number, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json({ data }, { status: init?.status ?? 200 });
}

type Handler<TCtx> = (req: Request, ctx: TCtx) => Promise<NextResponse | Response>;

/** 包住 route handler：Zod → 422、AppError → 對應狀態碼、其他 → 500（訊息不外洩）。 */
export function withErrorHandling<TCtx>(handler: Handler<TCtx>): Handler<TCtx> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      if (err instanceof ZodError) {
        const first = err.issues[0];
        const where = first?.path?.join(".") ?? "";
        return jsonError(
          "validation_error",
          422,
          `輸入格式不正確${where ? `（${where}）` : ""}：${first?.message ?? ""}`,
        );
      }
      if (err instanceof AppError) {
        return jsonError(err.code, err.status, err.message);
      }
      console.error("[api] unhandled error:", err);
      return jsonError("internal_error", 500, "伺服器發生錯誤，請稍後再試");
    }
  };
}
