// Application error types shared by services and server actions. Server actions catch these and
// return a safe, user-facing message; anything else becomes a generic error.

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "UNAVAILABLE" = "VALIDATION",
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "You need to sign in to continue.") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to do that.") {
    super(message, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We could not find what you were looking for.") {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT");
    this.name = "ConflictError";
  }
}

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function toActionError(error: unknown): { ok: false; error: string } {
  if (error instanceof AppError) return { ok: false, error: error.message };
  if (error instanceof Error && error.name === "RateLimitError") return { ok: false, error: error.message };
  console.error("[action] unexpected error", error);
  return { ok: false, error: "Something went wrong. Please try again." };
}
