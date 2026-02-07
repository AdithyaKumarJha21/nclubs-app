export type QrPayload = {
  eventId: string;
  token?: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const parseQrPayload = (raw: string): QrPayload | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { eventId?: unknown; token?: unknown };
    if (isNonEmptyString(parsed.eventId)) {
      return {
        eventId: parsed.eventId.trim(),
        token: isNonEmptyString(parsed.token) ? parsed.token.trim() : undefined,
      };
    }
  } catch (error) {
    // Ignore JSON parsing errors and fall back to string parsing.
  }

  const [eventId, token] = raw.split(":");
  if (!isNonEmptyString(eventId)) return null;

  return {
    eventId: eventId.trim(),
    token: isNonEmptyString(token) ? token.trim() : undefined,
  };
};

export const buildQrPayload = (eventId: string, token: string): string =>
  JSON.stringify({ eventId, token });
