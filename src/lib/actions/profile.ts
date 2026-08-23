"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

type ActionResult = { error?: string };

export async function updateMyProfile(name: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!name.trim()) return { error: "Nama tidak boleh kosong" };

  const supabase = await createClient();
  // RLS + column privilege hanya mengizinkan update kolom name/avatar_url
  const { error } = await supabase
    .from("profiles")
    .update({ name: name.trim() })
    .eq("id", profile.id);
  if (error) return { error: error.message };

  revalidatePath("/pengaturan");
  revalidatePath("/dashboard");
  return {};
}
