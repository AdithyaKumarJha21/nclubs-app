// api/client.ts
export async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e: any) {
    console.error("API error:", e);
    return null;
  }
}
