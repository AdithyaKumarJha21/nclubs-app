export const parseISOToDate = (iso: string): Date | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

export const formatTimeLocal = (iso: string): string => {
  const date = parseISOToDate(iso);
  if (!date) {
    return iso;
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const isWithinEventWindow = (
  startISO: string,
  endISO: string,
  now: Date = new Date()
): boolean => {
  const start = parseISOToDate(startISO);
  const end = parseISOToDate(endISO);

  if (!start || !end) {
    return false;
  }

  return now >= start && now <= end;
};

export const getEventWindowStatus = (
  startISO: string,
  endISO: string,
  now: Date = new Date()
): "before" | "during" | "after" | "invalid" => {
  const start = parseISOToDate(startISO);
  const end = parseISOToDate(endISO);

  if (!start || !end) {
    return "invalid";
  }

  if (now < start) return "before";
  if (now > end) return "after";
  return "during";
};
