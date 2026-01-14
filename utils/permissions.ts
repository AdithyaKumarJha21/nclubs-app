/* ======================================================
   TYPES
   ====================================================== */

export type Role = "student" | "faculty" | "president" | "admin";

export type User = {
  id: string;
  role: Role;
};

export type Event = {
  start_time: string; // ISO string
  end_time: string;   // ISO string
  qr_enabled: boolean;
  status: "active" | "expired";
};

/* ======================================================
   CLUB PERMISSIONS
   ====================================================== */

// Can edit club content
export const canEditClub = (
  user: User | null,
  isAssigned: boolean
): boolean => {
  if (!user) return false;

  if (user.role === "admin") return true;

  if (
    (user.role === "faculty" || user.role === "president") &&
    isAssigned
  ) {
    return true;
  }

  return false;
};

// Can change club president
export const canChangePresident = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === "admin" || user.role === "president";
};

/* ======================================================
   EVENT ATTENDANCE — STUDENT LOGIC
   ====================================================== */

// Can student register for an event?
export const canRegisterForEvent = (
  user: User | null,
  event: Event
): boolean => {
  if (!user) return false;
  if (user.role !== "student") return false;
  if (event.status !== "active") return false;

  return true;
};

// Can QR be shown to student (during event window only)?
export const canShowQRToStudent = (
  user: User | null,
  event: Event
): boolean => {
  if (!user) return false;
  if (user.role !== "student") return false;
  if (!event.qr_enabled) return false;

  const now = new Date();
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  return now >= start && now <= end;
};

/* ======================================================
   EVENT QR CONTROL — PRESIDENT / ADMIN
   ====================================================== */

// Can generate QR for an event?
export const canGenerateQR = (
  user: User | null,
  event: Event
): boolean => {
  if (!user) return false;

  if (user.role !== "president" && user.role !== "admin") {
    return false;
  }

  if (event.status !== "active") return false;
  if (event.qr_enabled) return false;

  return true;
};

// Can disable QR for an event?
export const canDisableQR = (
  user: User | null,
  event: Event
): boolean => {
  if (!user) return false;

  if (user.role !== "president" && user.role !== "admin") {
    return false;
  }

  if (!event.qr_enabled) return false;

  return true;
};
