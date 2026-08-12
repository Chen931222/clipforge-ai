export type ApiErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation_error"
  | "conflict"
  | "payload_too_large"
  | "unsupported_media_type"
  | "provider_error"
  | "internal_error";

export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, status: number, message: string) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const unauthorized = (message = "請先登入") =>
  new AppError("unauthorized", 401, message);
export const forbidden = (message = "沒有存取這個資源的權限") =>
  new AppError("forbidden", 403, message);
export const notFound = (message = "找不到資源") =>
  new AppError("not_found", 404, message);
export const validationError = (message: string) =>
  new AppError("validation_error", 422, message);
