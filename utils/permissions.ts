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
   ATTENDANCE HISTORY (ROLE VIEWS) ✅ FIXED
   ====================================================== */

// Who can view attendance history?
export const canViewAttendance = (user: User | null): boolean => {
  if (!user) return false;
  return user.role !== "student";
};

// Is student-style attendance view?
export const isStudentView = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === "student";
};

// Is faculty-style attendance view?
export const isFacultyView = (user: User | null): boolean => {
  if (!user) return false;
  return (
    user.role === "faculty" ||
    user.role === "president" ||
    user.role === "admin"
  );
};

/* ======================================================
   CLUB PERMISSIONS
   ====================================================== */

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

export const canChangePresident = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === "admin" || user.role === "president";
};

/* ======================================================
   EVENT ATTENDANCE — STUDENT
   ====================================================== */

export const canRegisterForEvent = (
  user: User | null,
  event: Event
): boolean => {
  if (!user) return false;
  if (user.role !== "student") return false;
  if (event.status !== "active") return false;

  return true;
};

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

export const canGenerateQR = (
  user: User | null,
  event: Event
): boolean => {
  if (!user) return false;
  if (user.role !== "president" && user.role !== "admin") return false;
  if (event.status !== "active") return false;
  if (event.qr_enabled) return false;

  return true;
};

export const canDisableQR = (
  user: User | null,
  event: Event
): boolean => {
  if (!user) return false;
  if (user.role !== "president" && user.role !== "admin") return false;
  if (!event.qr_enabled) return false;

  return true;
};

/* ======================================================
   QR SCREEN ACCESS (ROLE ONLY)
   ====================================================== */

export const canAccessQRScreen = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === "president" || user.role === "admin";
};
