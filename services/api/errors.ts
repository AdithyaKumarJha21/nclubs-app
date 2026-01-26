export type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractSupabaseError = (err: unknown): SupabaseErrorLike | null => {
  if (!isObject(err)) {
    return null;
  }

  const code = typeof err.code === "string" ? err.code : undefined;
  const message = typeof err.message === "string" ? err.message : undefined;

  if (!code && !message) {
    return null;
  }

  return { code, message };
};

export const normalizeSupabaseError = (err: unknown): string => {
  const parsed = extractSupabaseError(err);
  const code = parsed?.code;
  const message = parsed?.message?.toLowerCase() ?? "";

  if (code === "PGRST116") {
    return "No assignment found. Contact admin.";
  }

  if (code === "22P02" || message.includes("invalid input syntax for type uuid")) {
    return "Invalid club assignment.";
  }

  if (
    code === "42501" ||
    message.includes("permission denied") ||
    message.includes("row-level security")
  ) {
    return "Not authorized.";
  }

  if (code === "23505") {
    return "Already exists.";
  }

  return "Something went wrong.";
};
