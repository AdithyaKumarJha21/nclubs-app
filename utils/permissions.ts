type Role = "student" | "faculty" | "president" | "admin";

type User = {
  id: string;
  role: Role;
};

export const canEditClub = (
  user: User | null,
  isAssigned: boolean
) => {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role === "faculty" && isAssigned) return true;
  if (user.role === "president" && isAssigned) return true;
  return false;
};

export const canGenerateQR = (
  user: User | null,
  isAssigned: boolean
) => {
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

export const canChangePresident = (user: User | null) => {
  if (!user) return false;
  return user.role === "admin" || user.role === "president";
};
