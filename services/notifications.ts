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
    throw new Error("Please log in to continue.");
  }

  const payload = {
    club_id: clubId,
    created_by: user.id,
    title: title.trim(),
    body: body.trim(),
  };

  console.log("📣 sendNotification payload", {
    role,
    userId: user.id,
    clubId,
    payloadKeys: Object.keys(payload),
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
