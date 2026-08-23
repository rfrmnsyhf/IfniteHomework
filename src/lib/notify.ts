import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyUsers(
  userIds: string[],
  n: { title: string; body?: string; link?: string }
) {
  const valid = userIds.filter(Boolean);
  if (valid.length === 0) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(valid.map((user_id) => ({ user_id, ...n })));
}
