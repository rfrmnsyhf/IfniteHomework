"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function updateMyProfile(name: string): Promise<{ error?: string }> {
  const profile = await requireProfile();
  if (!name.trim()) return { error: "Nama tidak boleh kosong" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name: name.trim() })
    .eq("id", profile.id);

  if (error) return { error: error.message };

  revalidatePath("/pengaturan");
  revalidatePath("/dashboard");
  return {};
}


