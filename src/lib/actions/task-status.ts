"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { PersonalTaskStatus } from "@/lib/types";

export async function setMyTaskStatus(taskId: string, status: PersonalTaskStatus) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase.from("user_task_status").upsert({
    task_id: taskId,
    user_id: profile.id,
    status,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/tugas");
  revalidatePath(`/tugas/${taskId}`);
  return {};
}

export async function saveTaskNotes(taskId: string, notes: string) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("user_task_status")
    .select("status")
    .eq("task_id", taskId)
    .eq("user_id", profile.id)
    .maybeSingle();

  const { error } = await supabase.from("user_task_status").upsert({
    task_id: taskId,
    user_id: profile.id,
    status: existing?.status ?? "belum_dikerjakan",
    notes,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath(`/tugas/${taskId}`);
  return {};
}

export async function toggleChecklistItem(itemId: string, completed: boolean) {
  await requireProfile();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("checklists")
    .select("task_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return { error: "Item checklist tidak ditemukan" };

  const { error } = await supabase
    .from("checklists")
    .update({ completed })
    .eq("id", itemId);
  if (error) return { error: error.message };

  revalidatePath(`/tugas/${item.task_id}`);
  revalidatePath("/tugas");
  return {};
}
