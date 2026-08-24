"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { FeedbackCategory, FeedbackPriority } from "@/lib/types";

export async function createFeedback(input: {
  category: FeedbackCategory;
  title: string;
  description: string;
  priority: FeedbackPriority;
  is_anonymous: boolean;
}): Promise<{ error?: string }> {
  const p = await requireProfile();
  if (!input.title.trim() || input.title.trim().length < 3) return { error: "Judul minimal 3 karakter" };
  if (!input.description.trim() || input.description.trim().length < 10) return { error: "Deskripsi minimal 10 karakter" };
  const supa = await createClient();
  const { error } = await supa.from("feedback").insert({
    user_id: p.id,
    category: input.category,
    title: input.title.trim(),
    description: input.description.trim(),
    priority: input.priority,
    is_anonymous: input.is_anonymous,
  });
  if (error) return { error: error.message };
  revalidatePath("/feedback");
  return {};
}

export async function updateFeedbackAdmin(
  id: string,
  patch: { status?: string; admin_response?: string | null }
): Promise<{ error?: string }> {
  const p = await requireProfile();
  if (p.role !== "admin") return { error: "Hanya admin" };
  const supa = await createClient();
  const payload: Record<string, unknown> = {};
  if (patch.status) payload.status = patch.status;
  if (patch.admin_response !== undefined) payload.admin_response = patch.admin_response?.trim() || null;
  if (Object.keys(payload).length === 0) return { error: "Tidak ada perubahan" };
  const { error } = await supa.from("feedback").update(payload).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/feedback");
  return {};
}
