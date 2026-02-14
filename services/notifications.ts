import { Role } from "../context/AuthContext";
import { normalizeSupabaseError } from "./api/errors";
import { getMyClubs, isValidUuid } from "./assignments";
import { supabase } from "./supabase";

export type NotificationClubOption = {
  id: string;
  name: string;
};

export type SendNotificationInput = {
  clubId: string;
  title: string;
  body: string;
  role: Role;
};

export type NotificationRecord = {
  id: string;
  club_id: string;
  club_name: string;
  title: string;
  body: string;
  created_at: string;
};

type NotificationRow = {
  id: string;
  club_id: string;
  title: string;
  body: string;
  created_at: string;
  clubs: { name: string | null } | { name: string | null }[] | null;
};

const toNotificationRecord = (row: NotificationRow): NotificationRecord => {
  const clubData = Array.isArray(row.clubs) ? row.clubs[0] : row.clubs;

  return {
    id: row.id,
    club_id: row.club_id,
    club_name: clubData?.name?.trim() || "Unknown Club",
    title: row.title,
    body: row.body,
    created_at: row.created_at,
  };
};

const getTodayUtcWindow = () => {
  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const startOfTomorrowUtc = new Date(startOfTodayUtc);
  startOfTomorrowUtc.setUTCDate(startOfTomorrowUtc.getUTCDate() + 1);

  return {
    startIso: startOfTodayUtc.toISOString(),
    endIso: startOfTomorrowUtc.toISOString(),
  };
};

type SupabaseRequestError = Error & { code?: string };

export const getNotificationClubOptions = async (
  role: Role,
  userId: string
): Promise<NotificationClubOption[]> => {
  if (role === "admin") {
    const { data, error } = await supabase
      .from("clubs")
      .select("id, name")
      .order("name");

    if (error || !data) {
      throw new Error(normalizeSupabaseError(error));
    }

    return data
      .filter((club) => isValidUuid(club.id))
      .map((club) => ({ id: club.id, name: club.name ?? club.id }));
  }

  const clubIds = await getMyClubs({ id: userId, role });

  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("id, name")
    .in("id", clubIds)
    .order("name");

  if (error || !data) {
    throw new Error(normalizeSupabaseError(error));
  }

  return data
    .filter((club) => clubIds.includes(club.id))
    .map((club) => ({ id: club.id, name: club.name ?? club.id }));
};

export const sendNotification = async ({
  clubId,
  title,
  body,
  role,
}: SendNotificationInput) => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Session expired. Please login again.");
  }

  if (role !== "admin") {
    const assignedClubIds = await getMyClubs({ id: user.id, role });
    if (!assignedClubIds.includes(clubId)) {
      const permissionError = new Error(
        "Not allowed to send notification for this club."
      ) as SupabaseRequestError;
      permissionError.code = "42501";
      throw permissionError;
    }
  }

  const payload = {
    club_id: clubId,
    user_id: user.id,
    title: title.trim(),
    body: body.trim(),
  };

  console.log("📣 sendNotification payload", {
    clubId,
    userId: user.id,
    titleLen: title.length,
    messageLen: body.length,
  });

  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select("id")
    .maybeSingle();

  console.log("📣 sendNotification insert result", { data, error });

  if (error) {
    throw error;
  }

  return data;
};

export const getNotificationCountForClubToday = async (
  clubId: string
): Promise<number> => {
  const { startIso, endIso } = getTodayUtcWindow();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .gte("created_at", startIso)
    .lt("created_at", endIso);

  if (error) {
    throw new Error(normalizeSupabaseError(error));
  }

  return count ?? 0;
};

export const getVisibleNotifications = async (
  role: Role,
  userId: string
): Promise<NotificationRecord[]> => {
  const { startIso, endIso } = getTodayUtcWindow();

  if (role !== "faculty" && role !== "president") {
    const { data, error } = await supabase
      .from("notifications")
      .select("id, club_id, title, body, created_at, clubs(name)")
      .gte("created_at", startIso)
      .lt("created_at", endIso)
      .order("created_at", { ascending: false });

    if (error || !data) {
      throw new Error(normalizeSupabaseError(error));
    }

    return (data as NotificationRow[]).map(toNotificationRecord);
  }

  const clubIds = await getMyClubs({ id: userId, role });
  if (clubIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("notifications")
    .select("id, club_id, title, body, created_at, clubs(name)")
    .in("club_id", clubIds)
    .gte("created_at", startIso)
    .lt("created_at", endIso)
    .order("created_at", { ascending: false });

  if (error || !data) {
    throw new Error(normalizeSupabaseError(error));
  }

  return (data as NotificationRow[]).map(toNotificationRecord);
};

export const deleteNotification = async (
  notificationId: string
): Promise<{ ok: true } | { ok: false; message: string; code?: string }> => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      code: authError?.code ?? "401",
      message: "Please login again.",
    };
  }

  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .select("id");

  console.log("🗑️ deleteNotification result", {
    notificationId,
    dataLength: data?.length ?? 0,
    error,
  });

  if (error) {
    return {
      ok: false,
      code: error.code,
      message: error.message || "Failed to delete notification.",
    };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      message: "Not deleted (not found or not allowed)",
    };
  }

  return { ok: true };
};
