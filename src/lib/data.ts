import { createClient } from "@/lib/supabase/server";
import { getMyClassId, getProfile } from "@/lib/auth";
import type {
  Announcement,
  Attachment,
  ChecklistItem,
  Course,
  Group,
  Notification,
  PersonalTaskStatus,
  Profile,
  ProfileSensitive,
  Submission,
  Task,
} from "./types";

// ============================ TASKS ==========================

interface RawTask extends Task {
  course: { name: string; color: string | null } | null;
}

function mergeTaskMeta(
  raw: RawTask[],
  statuses: Array<{ task_id: string; status: PersonalTaskStatus; notes: string | null }>,
  checklists: Array<{ task_id: string; completed: boolean }>
) {
  const statusMap = new Map(statuses.map((s) => [s.task_id, s]));
  const clMap = new Map<string, { total: number; done: number }>();
  for (const c of checklists) {
    const agg = clMap.get(c.task_id) ?? { total: 0, done: 0 };
    agg.total++;
    if (c.completed) agg.done++;
    clMap.set(c.task_id, agg);
  }
  return raw.map((t) => ({
    ...t,
    course_name: t.course?.name ?? "-",
    course_color: t.course?.color ?? null,
    my_status: (statusMap.get(t.id)?.status ?? "belum_dikerjakan") as PersonalTaskStatus,
    my_notes: statusMap.get(t.id)?.notes ?? "",
    checklist_total: clMap.get(t.id)?.total ?? 0,
    checklist_done: clMap.get(t.id)?.done ?? 0,
  }));
}

async function fetchTaskMeta(taskIds: string[], userId?: string) {
  const supabase = await createClient();
  if (taskIds.length === 0) return { statuses: [], checklists: [] };

  let statusQuery = supabase
    .from("user_task_status")
    .select("task_id, status, notes")
    .in("task_id", taskIds);
  if (userId) statusQuery = statusQuery.eq("user_id", userId);
  const { data: statuses } = await statusQuery;

  const { data: checklists } = await supabase
    .from("checklists")
    .select("task_id, completed")
    .in("task_id", taskIds);

  return {
    statuses: (statuses ?? []) as Array<{ task_id: string; status: PersonalTaskStatus; notes: string | null }>,
    checklists: (checklists ?? []) as Array<{ task_id: string; completed: boolean }>,
  };
}

/** Semua tugas yang harus dikerjakan user (mahasiswa: assignment-nya; admin: seluruh kelas) */
export async function getMyTasks(): Promise<Awaited<ReturnType<typeof buildMyTasks>>> {
  return buildMyTasks();
}

async function buildMyTasks() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  let ids: string[] = [];
  if (profile.role === "admin") {
    const classId = await getMyClassId();
    if (!classId) return [];
    const { data } = await supabase
      .from("tasks")
      .select("id, course:courses!inner(class_id)")
      .eq("course.class_id", classId);
    ids = (data ?? []).map((t: { id: string }) => t.id);
  } else {
    const { data } = await supabase
      .from("task_assignments")
      .select("task_id")
      .eq("user_id", profile.id);
    ids = (data ?? []).map((a) => a.task_id);
  }
  if (ids.length === 0) return [];

  const { data: raw } = await supabase
    .from("tasks")
    .select("*, course:courses(name, color)")
    .in("id", ids)
    .order("deadline", { ascending: true });

  const { statuses, checklists } = await fetchTaskMeta(ids, profile.id);
  return mergeTaskMeta((raw ?? []) as RawTask[], statuses, checklists);
}

export async function getTaskById(taskId: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return null;

  const { data: task } = await supabase
    .from("tasks")
    .select("*, course:courses(name, color)")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return null;

  const { statuses, checklists } = await fetchTaskMeta([taskId], profile.id);
  const [merged] = mergeTaskMeta([task as RawTask], statuses, checklists);

  const { data: attachments } = await supabase
    .from("attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  const { data: fullChecklist } = await supabase
    .from("checklists")
    .select("*")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: true });

  return {
    task: merged,
    attachments: (attachments ?? []) as Attachment[],
    checklist: (fullChecklist ?? []) as ChecklistItem[],
  };
}

/** Tugas satu mata kuliah (halaman course) */
export async function getTasksByCourse(courseId: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { data: raw } = await supabase
    .from("tasks")
    .select("*, course:courses(name, color)")
    .eq("course_id", courseId)
    .order("deadline", { ascending: true });
  const ids = ((raw ?? []) as RawTask[]).map((t) => t.id);
  const { statuses, checklists } = await fetchTaskMeta(ids, profile.role === "mahasiswa" ? profile.id : undefined);
  return mergeTaskMeta((raw ?? []) as RawTask[], statuses, checklists);
}

/** Tugas dalam rentang waktu (kalender) */
export async function getTasksInRange(startIso: string, endIso: string) {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return [];

  const { data: raw } = await supabase
    .from("tasks")
    .select("*, course:courses(name, color)")
    .gte("deadline", startIso)
    .lte("deadline", endIso)
    .order("deadline", { ascending: true });
  const ids = ((raw ?? []) as RawTask[]).map((t) => t.id);
  const { statuses, checklists } = await fetchTaskMeta(
    ids,
    profile.role === "mahasiswa" ? profile.id : undefined
  );
  return mergeTaskMeta((raw ?? []) as RawTask[], statuses, checklists);
}

/** Progres kelas untuk admin: per tugas, berapa mahasiswa selesai */
export async function getClassProgress() {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") return null;
  const classId = await getMyClassId();
  if (!classId) return null;

  const [{ data: memberRows }, { data: taskRows }] = await Promise.all([
    supabase.from("class_members").select("user_id").eq("class_id", classId),
    supabase
      .from("tasks")
      .select("id, title, deadline, course:courses!inner(name, class_id)")
      .eq("course.class_id", classId)
      .order("deadline", { ascending: true }),
  ]);

  const studentIds = (memberRows ?? [])
    .map((m) => m.user_id)
    .filter((id) => id !== profile.id);
  const taskIds = (taskRows ?? []).map((t) => t.id);

  const { data: statuses } =
    taskIds.length > 0 && studentIds.length > 0
      ? await supabase
          .from("user_task_status")
          .select("task_id, user_id, status")
          .in("task_id", taskIds)
          .in("user_id", studentIds)
      : { data: [] };

  const perTask = (taskRows ?? []).map((t) => {
    const rows = (statuses ?? []).filter((s) => s.task_id === t.id);
    const done = rows.filter((s) => s.status === "selesai").length;
    return {
      id: t.id,
      title: t.title,
      course_name: (t.course as unknown as { name: string }).name,
      deadline: t.deadline,
      total_students: studentIds.length,
      done,
      not_started: studentIds.length - rows.filter((s) => s.status !== "belum_dikerjakan").length,
    };
  });

  return { perTask };
}

// =========================== COURSES =========================

export async function getCourses(): Promise<Array<Course & { total: number; done: number }>> {
  const supabase = await createClient();
  const classId = await getMyClassId();
  if (!classId) return [];

  const { data: courses } = await supabase
    .from("courses")
    .select("*")
    .eq("class_id", classId)
    .order("name");

  const { data: taskRows } = await supabase
    .from("tasks")
    .select("id, course_id, course:courses!inner(class_id)")
    .eq("course.class_id", classId);

  const taskIds = (taskRows ?? []).map((t) => t.id);
  const profile = await getProfile();
  const { statuses } = await fetchTaskMeta(taskIds, profile?.id);

  return ((courses ?? []) as Course[]).map((c) => {
    const ct = (taskRows ?? []).filter((t) => t.course_id === c.id).map((t) => t.id);
    const st = statuses.filter((s) => ct.includes(s.task_id));
    return { ...c, total: ct.length, done: st.filter((s) => s.status === "selesai").length };
  });
}

// ============================ GROUPS =========================

export async function getGroups(): Promise<Group[]> {
  const supabase = await createClient();
  const classId = await getMyClassId();
  if (!classId) return [];

  const { data: groups } = await supabase
    .from("groups")
    .select("*")
    .eq("class_id", classId)
    .order("name");
  const groupList = groups ?? [];
  if (groupList.length === 0) return [];

  const { data: gm } = await supabase
    .from("group_members")
    .select("group_id, user_id, role_in_group, profile:profiles(id, email, name, role, avatar_url)")
    .in("group_id", groupList.map((g) => g.id));

  return groupList.map((g) => ({
    ...g,
    members: (gm ?? [])
      .filter((m) => m.group_id === g.id)
      .map((m) => ({
        user_id: m.user_id,
        role_in_group: m.role_in_group,
        profile: m.profile as unknown as Profile,
      })),
  })) as Group[];
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const all = await getGroups();
  return all.find((g) => g.id === groupId) ?? null;
}

// ======================== ANNOUNCEMENTS ======================

export async function getAnnouncements(): Promise<Announcement[]> {
  const supabase = await createClient();
  const classId = await getMyClassId();
  if (!classId) return [];
  const { data } = await supabase
    .from("announcements")
    .select("*, author:profiles(name)")
    .eq("class_id", classId)
    .order("created_at", { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((a) => ({
    ...(a as unknown as Announcement),
    author_name: (a.author as { name?: string } | null)?.name ?? null,
  }));
}

// ========================== MEMBERS ==========================

export async function getClassMembers(): Promise<Array<{ profile: Profile }>> {
  const supabase = await createClient();
  const classId = await getMyClassId();
  if (!classId) return [];
  const { data } = await supabase
    .from("class_members")
    .select("profile:profiles(id, email, name, nim, role, avatar_url, password_changed)")
    .eq("class_id", classId);
  return (data ?? []).map((d) => ({ profile: d.profile as unknown as Profile }));
}

export async function getClassMemberDetail(userId: string): Promise<ProfileSensitive | null> {
  const me = await getProfile();
  if (!me) return null;
  if (me.id !== userId && me.role !== "admin") return null;
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, name, nim, role, avatar_url, password_changed, alamat, no_hp, jenis_kelamin, tempat_lahir, tgl_lahir")
    .eq("id", userId)
    .maybeSingle();
  return (data as ProfileSensitive) ?? null;
}

// ======================= NOTIFICATIONS =======================

export async function getNotifications(limit = 30): Promise<{
  items: Notification[];
  unread: number;
}> {
  const supabase = await createClient();
  const profile = await getProfile();
  if (!profile) return { items: [], unread: 0 };

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const items = (data ?? []) as Notification[];
  return { items, unread: items.filter((n) => !n.read).length };
}

// ========================== FEEDBACK =========================
export async function getFeedbacks(): Promise<import("./types").Feedback[]> {
  const supa = await createClient();
  const { data } = await supa.from("feedback").select("*, author:profiles(name)").order("created_at", { ascending: false });
  return ((data ?? []) as Array<Record<string, unknown>>).map((f) => ({ ...(f as unknown as import("./types").Feedback), author_name: (f.author as { name?: string } | null)?.name ?? null }));
}

// ========================= SUBMISSIONS =======================

export async function getMySubmission(taskId: string, userId: string): Promise<Submission | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Submission) ?? null;
}

export async function getTaskSubmissions(taskId: string): Promise<Submission[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("submissions")
    .select("*, student:profiles(name)")
    .eq("task_id", taskId)
    .order("submitted_at", { ascending: true });
  return ((data ?? []) as Array<Record<string, unknown>>).map((s) => ({
    ...(s as unknown as Submission),
    student_name: (s.student as { name?: string } | null)?.name ?? null,
  }));
}
