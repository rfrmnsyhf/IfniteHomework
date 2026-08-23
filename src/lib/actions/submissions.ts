"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, getProfile } from "@/lib/auth";
import { notifyUsers } from "@/lib/notify";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function sanitizeName(name: string) {
  return name.replace(/[^\w.\-() ]+/g, "_").slice(0, 120);
}

export interface SubmissionInput {
  taskId: string;
  content: string;
  file: File | null;
}

export async function upsertSubmission(input: SubmissionInput): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "mahasiswa") return { error: "Hanya mahasiswa yang dapat mengumpulkan tugas" };

  const supabase = await createClient();

  // verifikasi window submission (paralel dengan RLS — defense in depth)
  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, allow_submission, deadline, submission_deadline")
    .eq("id", input.taskId)
    .maybeSingle();
  if (!task) return { error: "Tugas tidak ditemukan" };
  if (!task.allow_submission)
    return { error: "Tugas ini tidak menerima pengumpulan file" };

  const cutoff = task.submission_deadline ?? task.deadline;
  if (Date.now() > new Date(cutoff).getTime()) {
    return { error: "Batas waktu pengumpulan sudah lewat" };
  }

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status")
    .eq("task_id", input.taskId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (existing && existing.status === "graded") {
    return { error: "Submission sudah dinilai dan tidak dapat diubah" };
  }

  let storagePath: string | null = null;
  let fileName: string | null = null;

  if (input.file && input.file.size > 0) {
    if (input.file.size > MAX_FILE_SIZE) return { error: "Ukuran file maksimal 50 MB" };
    fileName = sanitizeName(input.file.name);
    storagePath = `${profile.id}/${input.taskId}/${Date.now()}-${fileName}`;
    const { error: uploadErr } = await supabase.storage
      .from("submissions")
      .upload(storagePath, input.file, { upsert: false });
    if (uploadErr) return { error: `Upload gagal: ${uploadErr.message}` };
  }
  if (!storagePath && !existing && !input.content.trim()) {
    return { error: "Isi catatan atau lampirkan file" };
  }

  let dbError: { message: string } | null = null;
  if (existing) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      status: "revised",
    };
    if (input.content.trim()) patch.content = input.content.trim();
    if (storagePath) {
      patch.storage_path = storagePath;
      patch.file_url = fileName;
    }
    const { error } = await supabase.from("submissions").update(patch).eq("id", existing.id);
    if (error) dbError = error;
  } else {
    const { error } = await supabase.from("submissions").insert({
      task_id: input.taskId,
      user_id: profile.id,
      content: input.content.trim() || null,
      file_url: fileName,
      storage_path: storagePath,
    });
    if (error) dbError = error;
  }

  if (dbError) {
    if (storagePath) {
      await supabase.storage.from("submissions").remove([storagePath]);
    }
    return { error: `Gagal menyimpan submission: ${dbError.message}` };
  }

  // notifikasi admin
  const admin = createAdminClient();
  const { data: admins } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "admin");
  await notifyUsers((admins ?? []).map((a) => a.id), {
    title: `${profile.name} mengumpulkan "${task.title}"`,
    link: `/tugas/${input.taskId}`,
  });

  revalidatePath(`/tugas/${input.taskId}`);
  revalidatePath("/tugas");
  return {};
}

export async function deleteMySubmission(taskId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("submissions")
    .select("id, status, storage_path")
    .eq("task_id", taskId)
    .eq("user_id", profile.id)
    .maybeSingle();
  if (!existing) return { error: "Belum ada submission" };
  if (existing.status === "graded") return { error: "Sudah dinilai, tidak dapat dihapus" };

  const { error } = await supabase.from("submissions").delete().eq("id", existing.id);
  if (error) return { error: error.message };
  if (existing.storage_path) {
    await supabase.storage.from("submissions").remove([existing.storage_path]);
  }
  revalidatePath(`/tugas/${taskId}`);
  return {};
}

/** Admin memberi feedback + menandai graded — via admin client (bypass RLS terkontrol) */
export async function gradeSubmission(
  submissionId: string,
  feedback: string
): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return { error: "Hanya admin yang dapat menilai submission" };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: sub } = await supabase
    .from("submissions")
    .select("id, user_id, task_id")
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub) return { error: "Submission tidak ditemukan" };

  const { data: task } = await admin
    .from("tasks")
    .select("title")
    .eq("id", sub.task_id)
    .maybeSingle();

  const nowIso = new Date().toISOString();
  const { error } = await admin
    .from("submissions")
    .update({
      status: "graded",
      feedback: feedback.trim(),
      graded_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", submissionId);
  if (error) return { error: error.message };

  await notifyUsers([sub.user_id], {
    title: `Feedback untuk "${task?.title ?? "tugas"}"`,
    body: feedback.trim().slice(0, 140),
    link: `/tugas/${sub.task_id}`,
  });

  revalidatePath(`/tugas/${sub.task_id}`);
  return {};
}

/** Signed URL untuk unduh file submission milik sendiri / admin */
export async function getSubmissionDownloadUrl(submissionId: string) {
  const profile = await getProfile();
  if (!profile) return { error: "Tidak diizinkan" as const };

  const supabase = await createClient();
  const query = supabase
    .from("submissions")
    .select("storage_path, user_id")
    .eq("id", submissionId);

  const { data: sub } =
    profile.role === "admin"
      ? await query.maybeSingle()
      : await query.eq("user_id", profile.id).maybeSingle();

  if (!sub || !sub.storage_path) return { error: "File tidak tersedia" as const };
  if (profile.role !== "admin" && sub.user_id !== profile.id) {
    return { error: "Tidak diizinkan" as const };
  }

  const { data, error } = await supabase.storage
    .from("submissions")
    .createSignedUrl(sub.storage_path, 300);
  if (error) return { error: error.message };
  return { url: data.signedUrl };
}

type ActionResult = { error?: string };
