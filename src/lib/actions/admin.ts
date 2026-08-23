"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, getMyClassId, requireProfile } from "@/lib/auth";
import { notifyUsers } from "@/lib/notify";
import type {
  TaskPriority,
  TaskType,
} from "@/lib/types";

type ActionResult = { error?: string };

async function classStudentIds(classId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from("class_members")
    .select("user_id, profile:profiles!inner(role)")
    .eq("class_id", classId);
  return (members ?? [])
    .filter((m) => (m.profile as unknown as { role: string }).role === "mahasiswa")
    .map((m) => m.user_id);
}

// ============================ TUGAS ==========================

export interface TaskInput {
  id?: string;
  course_id: string;
  title: string;
  description: string;
  deadline: string;
  priority: TaskPriority;
  type: TaskType;
  allow_submission: boolean;
  submission_deadline: string | null;
}

export async function saveTask(input: TaskInput): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat mengelola tugas" };
  if (!input.title.trim()) return { error: "Judul wajib diisi" };

  const supabase = await createClient();

  if (input.id) {
    // deteksi perubahan deadline untuk notifikasi
    const { data: before } = await supabase
      .from("tasks")
      .select("deadline, title")
      .eq("id", input.id)
      .maybeSingle();

    const { error } = await supabase
      .from("tasks")
      .update({
        course_id: input.course_id,
        title: input.title.trim(),
        description: input.description,
        deadline: input.deadline,
        priority: input.priority,
        type: input.type,
        allow_submission: input.allow_submission,
        submission_deadline: input.submission_deadline,
      })
      .eq("id", input.id);
    if (error) return { error: error.message };

    if (before && new Date(before.deadline).getTime() !== new Date(input.deadline).getTime()) {
      const ids = await classStudentIds((await getClassOfCourse(input.course_id)) ?? "");
      await notifyUsers(ids, {
        title: `Deadline "${input.title.trim()}" diperbarui`,
        body: `Deadline baru: ${new Date(input.deadline).toLocaleString("id-ID")}`,
        link: `/tugas/${input.id}`,
      });
    }
  } else {
    const { data: created, error } = await supabase
      .from("tasks")
      .insert({
        course_id: input.course_id,
        title: input.title.trim(),
        description: input.description,
        deadline: input.deadline,
        priority: input.priority,
        type: input.type,
        allow_submission: input.allow_submission,
        submission_deadline: input.submission_deadline,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };

    // assign seluruh mahasiswa kelas
    const courseId = (created as { id: string }).id;
    const classId = await getClassOfCourse(input.course_id);
    if (classId) {
      const ids = await classStudentIds(classId);
      await supabase
        .from("task_assignments")
        .insert(ids.map((user_id) => ({ task_id: courseId, user_id })));
      await notifyUsers(ids, {
        title: `Tugas baru: ${input.title.trim()}`,
        body: "Cek detail tugas untuk checklist dan deadline.",
        link: `/tugas/${courseId}`,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/tugas");
  revalidatePath("/mata-kuliah");
  return {};
}

async function getClassOfCourse(courseId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("courses").select("class_id").eq("id", courseId).maybeSingle();
  return data?.class_id ?? null;
}

export async function deleteTask(taskId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat menghapus tugas" };
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/tugas");
  revalidatePath("/mata-kuliah");
  return {};
}

export async function addChecklistItem(taskId: string, title: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin" };
  if (!title.trim()) return { error: "Judul item kosong" };
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("checklists")
    .select("sort_order")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("checklists").insert({
    task_id: taskId,
    title: title.trim(),
    sort_order: (last?.sort_order ?? -1) + 1,
  });
  if (error) return { error: error.message };
  revalidatePath(`/tugas/${taskId}`);
  return {};
}

export async function removeChecklistItem(itemId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin" };
  const supabase = await createClient();
  const { error } = await supabase.from("checklists").delete().eq("id", itemId);
  if (error) return { error: error.message };
  revalidatePath("/tugas");
  return {};
}

// ========================= MATA KULIAH =======================

export async function saveCourse(
  input: { id?: string; name: string; lecturer_name?: string | null; color?: string | null }
): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat mengelola mata kuliah" };
  if (!input.name.trim()) return { error: "Nama mata kuliah wajib diisi" };

  const classId = await getMyClassId();
  if (!classId) return { error: "Kelas tidak ditemukan" };

  const supabase = await createClient();
  const payload = {
    name: input.name.trim(),
    lecturer_name: input.lecturer_name?.trim() || null,
    color: input.color || null,
  };

  const { error } =
    input.id
      ? await supabase.from("courses").update(payload).eq("id", input.id)
      : await supabase.from("courses").insert({ ...payload, class_id: classId });
  if (error) return { error: error.message };

  revalidatePath("/mata-kuliah");
  return {};
}

export async function deleteCourse(courseId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat menghapus mata kuliah" };
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { error: error.message };
  revalidatePath("/mata-kuliah");
  revalidatePath("/dashboard");
  revalidatePath("/tugas");
  return {};
}

// ========================== PENGUMUMAN =======================

export async function createAnnouncement(title: string, content: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.role !== "admin") return { error: "Hanya admin yang dapat membuat pengumuman" };
  if (!title.trim() || !content.trim()) return { error: "Judul dan isi wajib diisi" };

  const classId = await getMyClassId();
  if (!classId) return { error: "Kelas tidak ditemukan" };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    class_id: classId,
    title: title.trim(),
    content: content.trim(),
    created_by: profile.id,
  });
  if (error) return { error: error.message };

  const ids = await classStudentIds(classId);
  await notifyUsers(ids, {
    title: `Pengumuman: ${title.trim()}`,
    link: "/pengumuman",
  });

  revalidatePath("/pengumuman");
  return {};
}

export async function deleteAnnouncement(id: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat menghapus pengumuman" };
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/pengumuman");
  return {};
}

// =========================== KELOMPOK ========================

export async function saveGroup(
  input: { id?: string; name: string; project_title: string; description: string }
): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat mengelola kelompok" };
  if (!input.name.trim()) return { error: "Nama kelompok wajib diisi" };

  const classId = await getMyClassId();
  if (!classId) return { error: "Kelas tidak ditemukan" };

  const supabase = await createClient();
  const payload = {
    name: input.name.trim(),
    project_title: input.project_title.trim() || null,
    description: input.description.trim() || null,
  };
  const { error } = input.id
    ? await supabase.from("groups").update(payload).eq("id", input.id)
    : await supabase.from("groups").insert({ ...payload, class_id: classId });
  if (error) return { error: error.message };

  revalidatePath("/kelompok");
  return {};
}

export async function setGroupMember(
  groupId: string,
  userId: string,
  roleInGroup: string | null
): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat mengelola anggota kelompok" };
  const supabase = await createClient();

  if (roleInGroup === null) {
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("group_members")
      .upsert({ group_id: groupId, user_id: userId, role_in_group: roleInGroup });
    if (error) return { error: error.message };
  }
  revalidatePath(`/kelompok/${groupId}`);
  revalidatePath("/kelompok");
  return {};
}

export async function deleteGroup(groupId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat menghapus kelompok" };
  const supabase = await createClient();
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) return { error: error.message };
  revalidatePath("/kelompok");
  return {};
}

// ====================== ANGGOTA KELAS ========================

export async function addClassMember(email: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat mengelola anggota" };

  const classId = await getMyClassId();
  if (!classId) return { error: "Kelas tidak ditemukan" };

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, role")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (!target) return { error: "User dengan email tersebut belum terdaftar" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_members")
    .upsert({ class_id: classId, user_id: target.id }, { ignoreDuplicates: true });
  if (error) return { error: error.message };

  revalidatePath("/anggota");
  return {};
}

export async function removeClassMember(userId: string): Promise<ActionResult> {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return { error: "Hanya admin yang dapat mengelola anggota" };
  if (userId === profile.id) return { error: "Tidak dapat mengeluarkan diri sendiri" };

  const classId = await getMyClassId();
  if (!classId) return { error: "Kelas tidak ditemukan" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", classId)
    .eq("user_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/anggota");
  return {};
}
