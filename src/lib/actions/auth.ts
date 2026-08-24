"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loginWithNim(nim: string, password: string): Promise<{ error?: string; redirectTo?: string }> {
  const nimTrim = nim.trim();
  if (!nimTrim) return { error: "NIM wajib diisi" };
  if (!/^\d+$/.test(nimTrim)) return { error: "NIM hanya berupa angka" };

  // Use admin client to check NIM existence without RLS issues
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("password_changed")
    .eq("nim", nimTrim)
    .maybeSingle();

  if (profileError) return { error: "Database error" };
  if (!profile) return { error: "NIM tidak terdaftar" };

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: `${nimTrim}@classflow.local`,
    password,
  });

  if (authError) return { error: "Password salah atau NIM tidak valid" };

  if (!profile.password_changed) return { redirectTo: "/pengaturan?banner=password-default" };
  return { redirectTo: "/dashboard" };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<{ error?: string; success?: boolean }> {
  if (newPassword !== confirmPassword) return { error: "Password baru dan konfirmasi tidak cocok" };
  if (newPassword.length < 8) return { error: "Password baru harus minimal 8 karakter" };
  if (!currentPassword) return { error: "Password saat ini wajib diisi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tidak terautentikasi" };

  // Resolve email/NIM for re-auth verification
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("nim, email").eq("id", user.id).maybeSingle();
  const email = profile?.email ?? user.email ?? `${profile?.nim ?? ""}@classflow.local`;
  if (!email) return { error: "Email tidak ditemukan" };

  // Verify current password by attempting sign-in with a throwaway client
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const verifyClient = createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: verifyError } = await verifyClient.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) return { error: "Password saat ini salah" };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  const { error: updateError } = await supabase.from("profiles").update({ password_changed: true }).eq("id", user.id);
  if (updateError) {
    // Non-critical, password already changed in auth
    console.warn("Failed to update password_changed flag:", updateError.message);
  }
  return { success: true };
}
