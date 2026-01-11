// utils/errors.ts

export function getFriendlyError(e: any) {
  if (e.code === "401") return "Session expired.";
  if (e.code === "403") return "Not authorized.";
  if (e.code === "409" || e.message?.includes("duplicate"))
    return "Already exists.";
  if (e.code === "429") return "Too many requests. Try later.";
  return "Something went wrong.";
}
