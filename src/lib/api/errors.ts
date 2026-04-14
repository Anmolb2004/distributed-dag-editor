import { z } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_SERVER_ERROR"
  | "CONFLICT"
  | "VALIDATION_ERROR";

const STATUS_MAP: Record<ApiErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 422,
  INTERNAL_SERVER_ERROR: 500,
};

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly statusCode: number;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = STATUS_MAP[code];
  }

  toResponse() {
    return Response.json(
      { error: { code: this.code, message: this.message } },
      { status: this.statusCode }
    );
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return error.toResponse();
  }

  if (error instanceof z.ZodError) {
    const message = error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    return new ApiError("VALIDATION_ERROR", message).toResponse();
  }

  console.error("Unhandled API error:", error);
  return new ApiError(
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred"
  ).toResponse();
}
