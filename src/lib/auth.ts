import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClassInfo, Profile, ProfileSensitive } from "./types";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, name, nim, role, avatar_url, password_changed")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function getFullProfile(): Promise<ProfileSensitive | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, name, nim, role, avatar_url, password_changed, alamat, no_hp, jenis_kelamin, tempat_lahir, tgl_lahir")
    .eq("id", user.id)
    .maybeSingle();
  return (data as ProfileSensitive) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  return profile;
}

/** Halaman khusus admin — mahasiswa dilempar ke dashboard */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}

export async function getMyClassId(): Promise<string | null> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return null;
  const { data } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", profile.id)
    .limit(1)
    .maybeSingle();
  return data?.class_id ?? null;
}

export async function getMyClass(): Promise<ClassInfo | null> {
  const supabase = await createClient();
  const classId = await getMyClassId();
  if (!classId) return null;
  const { data } = await supabase
    .from("classes")
    .select("*")
    .eq("id", classId)
    .maybeSingle();
  return (data as ClassInfo) ?? null;
}
