/**
 * Normalized API error. The backend's error envelope is always `{ error: { code, message } }`
 * (see asset-management-backend's centralized errorHandler) — this wraps that shape so callers
 * can branch on `.code` instead of parsing response bodies themselves.
 */
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  static async fromResponse(res: Response): Promise<ApiError> {
    let body: { error?: { code?: string; message?: string }; message?: string } | null = null;
    try {
      body = await res.json();
    } catch {
      // no/invalid JSON body — fall back to statusText below
    }
    return new ApiError(
      res.status,
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? body?.message ?? res.statusText ?? "Request failed"
    );
  }
}
