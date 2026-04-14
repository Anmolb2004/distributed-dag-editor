import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "./errors";

/**
 * Higher-order auth wrapper (Dub pattern: `withWorkspace`).
 * Authenticates the request and passes userId to the handler.
 * All error handling is centralized here.
 */
export function withAuth(
  handler: (
    req: NextRequest,
    context: { userId: string; params: Record<string, string> }
  ) => Promise<Response>
) {
  return async (
    req: NextRequest,
    segmentData?: { params?: Promise<Record<string, string>> }
  ): Promise<Response> => {
    try {
      const { userId } = await auth();
      if (!userId) {
        throw new ApiError("UNAUTHORIZED", "Authentication required");
      }

      const params = segmentData?.params ? await segmentData.params : {};
      return await handler(req, { userId, params });
    } catch (error) {
      return handleApiError(error);
    }
  };
}
