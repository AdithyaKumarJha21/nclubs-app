export const sanitizeOtp = (value: string): string =>
  value.replace(/\D/g, "").slice(0, 6);

export const isValidEmail = (value: string): boolean => /\S+@\S+\.\S+/.test(value);

export type AppRole = "student" | "president" | "faculty" | "admin";

type RoleQueryResult = {
  roles: { name?: string | null } | { name?: string | null }[] | null;
};

export const extractRoleName = (profile: RoleQueryResult | null | undefined): AppRole | null => {
  if (!profile?.roles) {
    return null;
  }

  const roleRow = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;
  const normalizedRole = roleRow?.name?.toLowerCase();

  if (
    normalizedRole === "student" ||
    normalizedRole === "president" ||
    normalizedRole === "faculty" ||
    normalizedRole === "admin"
  ) {
    return normalizedRole;
  }

  return null;
};
