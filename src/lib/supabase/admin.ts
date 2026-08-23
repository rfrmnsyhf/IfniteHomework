import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin client (secret key) — SERVER ONLY.
 * Dipakai untuk operasi yang butuh bypass RLS: grading submission,
 * membuat notifikasi, dsb. Tidak boleh diimpor dari Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
