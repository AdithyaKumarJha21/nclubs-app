import { Role } from "../context/AuthContext";
import { supabase } from "./supabase";

type ProfileRoleRow = {
  roles: { name: string | null } | { name: string | null }[] | null;
};

const normalizeRole = (value: string | null | undefined): Role | null => {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase();
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

const getCurrentUserAndRole = async (): Promise<{ userId: string; role: Role } | null> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("roles(name)")
    .eq("id", user.id)
    .maybeSingle<ProfileRoleRow>();

  if (error || !data?.roles) {
    return null;
  }

  const roleName = Array.isArray(data.roles)
    ? data.roles[0]?.name ?? null
    : data.roles.name;

  const role = normalizeRole(roleName);
  if (!role) {
    return null;
  }

  return { userId: user.id, role };
};

export const canManageClub = async (clubId: string): Promise<boolean> => {
  const auth = await getCurrentUserAndRole();
  if (!auth || !clubId) {
    return false;
  }

  const { userId, role } = auth;

  if (role === "admin") {
    return true;
  }

  if (role === "faculty") {
    const { data, error } = await supabase
      .from("faculty_assignments")
      .select("id")
      .eq("faculty_id", userId)
      .eq("club_id", clubId)
      .limit(1);

    return !error && (data?.length ?? 0) > 0;
  }

  if (role === "president") {
    const { data, error } = await supabase
      .from("president_assignments")
      .select("id")
      .eq("user_id", userId)
      .eq("club_id", clubId)
      .limit(1);

    return !error && (data?.length ?? 0) > 0;
  }

  return false;
};

export const getMyManagedClubIds = async (): Promise<string[]> => {
  const auth = await getCurrentUserAndRole();
  if (!auth) {
    return [];
  }

  const { userId, role } = auth;

  if (role === "admin") {
    const { data, error } = await supabase.from("clubs").select("id");
    if (error || !data) {
      return [];
    }

    return data
      .map((row) => row.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
  }

  if (role === "faculty") {
    const { data, error } = await supabase
      .from("faculty_assignments")
      .select("club_id")
      .eq("faculty_id", userId);

    if (error || !data) {
      return [];
    }

    return data
      .map((row) => row.club_id)
      .filter((clubId): clubId is string => typeof clubId === "string" && clubId.length > 0);
  }

  if (role === "president") {
    const { data, error } = await supabase
      .from("president_assignments")
      .select("club_id")
      .eq("user_id", userId);

    if (error || !data) {
      return [];
    }

    return data
      .map((row) => row.club_id)
      .filter((clubId): clubId is string => typeof clubId === "string" && clubId.length > 0);
  }

  return [];
};
