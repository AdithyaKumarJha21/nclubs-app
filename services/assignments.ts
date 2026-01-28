import { Role } from "../context/AuthContext";
import { supabase } from "./supabase";

export type UserWithRole = {
  id: string;
  role?: Role;
  role_id?: string | null;
};

const roleCache = new Map<string, Role>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

const normalizeRole = (roleName: string): Role | null => {
  const normalized = roleName.toLowerCase();
  if (
    normalized === "student" ||
    normalized === "faculty" ||
    normalized === "president" ||
    normalized === "admin"
  ) {
    return normalized as Role;
  }
  return null;
};

const getRoleNameById = async (roleId: string): Promise<Role | null> => {
  const cached = roleCache.get(roleId);
  if (cached) {
    return cached;
  }

  const { data, error } = await supabase
    .from("roles")
    .select("name")
    .eq("id", roleId)
    .maybeSingle<{ name: string | null }>();

  if (error || !data?.name) {
    return null;
  }

  const normalized = normalizeRole(data.name);
  if (!normalized) {
    return null;
  }

  roleCache.set(roleId, normalized);
  return normalized;
};

type ProfileRoleRow = {
  role_id: string | null;
  roles: { name: string | null } | { name: string | null }[] | null;
};

const getRoleFromProfile = async (userId: string): Promise<Role | null> => {
  const { data, error } = await supabase
    .from("profiles")
    .select("role_id, roles(name)")
    .eq("id", userId)
    .maybeSingle<ProfileRoleRow>();

  if (error || !data) {
    return null;
  }

  let roleName: string | null = null;

  if (Array.isArray(data.roles)) {
    roleName = data.roles[0]?.name ?? null;
  } else {
    roleName = data.roles?.name ?? null;
  }

  const normalized = roleName ? normalizeRole(roleName) : null;
  if (normalized) {
    return normalized;
  }

  if (data.role_id) {
    return getRoleNameById(data.role_id);
  }

  return null;
};

export const getMyClubId = async (
  user: UserWithRole | null
): Promise<string | null> => {
  if (!user) {
    return null;
  }

  let resolvedRole: Role | null = await getRoleFromProfile(user.id);

  if (!resolvedRole) {
    resolvedRole = user.role ?? null;
  }

  if (!resolvedRole && user.role_id) {
    resolvedRole = await getRoleNameById(user.role_id);
  }

  if (!resolvedRole || resolvedRole === "admin") {
    return null;
  }

  if (resolvedRole === "president") {
    const { data, error } = await supabase
      .from("president_assignments")
      .select("club_id")
      .eq("user_id", user.id)
      .maybeSingle<{ club_id: string | null }>();

    console.log("🔎 President assignment lookup", { data, error });

    if (error || !data?.club_id) {
      return null;
    }

    return isValidUuid(data.club_id) ? data.club_id : null;
  }

  if (resolvedRole === "faculty") {
    const { data, error } = await supabase
      .from("faculty_assignments")
      .select("club_id")
      .eq("faculty_id", user.id)
      .maybeSingle<{ club_id: string | null }>();

    console.log("🔎 Faculty assignment lookup", { data, error });

    if (error || !data?.club_id) {
      return null;
    }

    return isValidUuid(data.club_id) ? data.club_id : null;
  }

  return null;
};
