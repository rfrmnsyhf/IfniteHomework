import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClassInfo, Profile } from "./types";

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile) ?? null;
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
