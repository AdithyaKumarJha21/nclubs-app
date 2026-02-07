export const isWithinEventWindow = (
  startISO: string,
  endISO: string,
  now: Date = new Date()
): boolean => {
  const start = new Date(startISO);
  const end = new Date(endISO);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return false;
  }

  return now >= start && now <= end;
};

export const getEventWindowStatus = (
  startISO: string,
  endISO: string,
  now: Date = new Date()
): "before" | "during" | "after" | "invalid" => {
  const start = new Date(startISO);
  const end = new Date(endISO);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "invalid";
  }

  if (now < start) return "before";
  if (now > end) return "after";
  return "during";
};
