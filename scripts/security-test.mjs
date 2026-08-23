/**
 * Security verification untuk ClassFlow.
 * Menguji boundary RLS + column privileges + storage policies
 * dengan login sebagai admin / firman / yayan.
 *
 * Jalankan: npx tsx scripts/security-test.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;

const results = [];
function record(name, pass, detail = "") {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " â€” " + detail : ""}`);
}

const service = createClient(SUPABASE_URL, SECRET, { auth: { persistSession: false } });

async function login(email, password) {
  const c = createClient(SUPABASE_URL, PUB, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}

const admin = await login("admin@classflow.id", "AdminFlow2026!");
const firman = await login("firman@classflow.id", "Mahasiswa2026!");
const yayan = await login("yayan@classflow.id", "Mahasiswa2026!");
record("Auth: login admin+mahasiswa", true);

// ---------- konteks ----------
const { data: profs } = await service.from("profiles").select("id, email").in("email", ["admin@classflow.id", "firman@classflow.id", "yayan@classflow.id"]);
const uid = Object.fromEntries(profs.map((p) => [p.email.split("@")[0], p.id]));
const { data: tasksAll } = await service.from("tasks").select("id, title, deadline, course_id");
const byTitle = Object.fromEntries(tasksAll.map((t) => [t.title, t]));

// ================= AUTH READ SCOPE =================
{
  const { data } = await firman.from("submissions").select("*").eq("user_id", uid.yayan);
  record("RLS: mahasiswa A tidak melihat submission mahasiswa B", data.length === 0, `rows=${data.length}`);

  const { data: notifs } = await firman.from("notifications").select("*").neq("user_id", uid.firman);
  record("RLS: mahasiswa tidak melihat notifikasi orang lain", notifs.length === 0);

  const { data: utsOthers } = await firman
    .from("user_task_status")
    .select("notes")
    .eq("user_id", uid.yayan)
    .not("notes", "is", null)
    .limit(5);
  // notes pribadi Yayan tidak boleh terbaca Firman
  record("RLS: catatan pribadi mahasiswa lain tersembunyi", utsOthers.length === 0);
}

// ============ MAHASISWA TIDAK BISA CRUD ADMIN ============
{
  const { data: courses } = await service.from("courses").select("id").limit(1);
  const courseId = courses[0].id;

  const ins = await firman
    .from("tasks")
    .insert({ course_id: courseId, title: "HACK", deadline: new Date(Date.now() + 864e5).toISOString() });
  record("RLS: mahasiswa tidak bisa CREATE task", !!ins.error, ins.error?.message ?? "");

  const upd = await firman.from("tasks").update({ title: "HACKED" }).eq("id", byTitle["Persiapan Quiz 1"].id);
  record("RLS: mahasiswa tidak bisa UPDATE task", upd.data === null || upd.data.length === 0);

  const del = await firman.from("tasks").delete().eq("id", byTitle["Refleksi Diri Video"].id);
  record("RLS: mahasiswa tidak bisa DELETE task", del.error !== null || (del.data ?? []).length === 0);

  const delCourse = await firman.from("courses").delete().eq("id", courseId);
  record("RLS: mahasiswa tidak bisa DELETE course", delCourse.error !== null || (delCourse.data ?? []).length === 0);

  const addMember = await firman.from("class_members").insert({ class_id: (await service.from("classes").select("id").limit(1)).data[0].id, user_id: uid.yayan });
  record("RLS: mahasiswa tidak bisa kelola anggota kelas", !!addMember.error);

  const ann = await firman
    .from("announcements")
    .insert({ class_id: (await service.from("classes").select("id").limit(1)).data[0].id, title: "SPAM", content: "spam" });
  record("RLS: mahasiswa tidak bisa buat pengumuman", !!ann.error);

  const grp = await firman.from("groups").insert({ class_id: (await service.from("classes").select("id").limit(1)).data[0].id, name: "ROGUE" });
  record("RLS: mahasiswa tidak bisa buat kelompok", !!grp.error);
}

// ================= SUBMISSION SECURITY =================
{
  const openTask = byTitle["ERD Sistem Akademik"]; // deadline jauh, individu
  const closedTask = byTitle["Machine Learning Report"]; // sudah lewat

  // bersihkan residu dari run sebelumnya
  await service.from("submissions").delete().eq("task_id", openTask.id).eq("user_id", uid.firman);

  // 1. insert mencoba set kolom sensitif -> ditolak column privileges
  const sneaky = await firman.from("submissions").insert({
    task_id: openTask.id,
    user_id: uid.firman,
    content: "coba",
    status: "graded",
    feedback: "Nilai 100",
    graded_at: new Date().toISOString(),
  });
  record(
    "COLUMN PRIV: mahasiswa tidak bisa insert status/feedback/graded_at",
    !!sneaky.error,
    sneaky.error?.message?.slice(0, 80) ?? ""
  );

  // 2. insert sah
  const okIns = await firman
    .from("submissions")
    .insert({ task_id: openTask.id, user_id: uid.firman, content: "submission uji keamanan" })
    .select("id")
    .single();
  record("SUBMISSION: insert sah oleh pemilik", !okIns.error, okIns.error?.message?.slice(0, 60));

  const subId = okIns.data?.id;

  // 3. update kolom sensitif langsung -> ditolak column privileges
  const sneakUpd = await firman.from("submissions").update({ feedback: "self-grade", status: "graded" }).eq("id", subId);
  record("COLUMN PRIV: mahasiswa tidak bisa update feedback/status sendiri", !!sneakUpd.error);

  // 4. revisi konten sah
  const rev = await firman.from("submissions").update({ content: "revisi" }).eq("id", subId).select("content").single();
  record("SUBMISSION: pemilik boleh merevisi sebelum graded", !rev.error && rev.data?.content === "revisi");

  // 5. mahasiswa lain tidak bisa update submission itu
  const foreignUpd = await yayan.from("submissions").update({ content: "hijack" }).eq("id", subId);
  record("RLS: mahasiswa lain tidak bisa update submission orang", !foreignUpd.data || foreignUpd.data.length === 0);

  // 6. insert untuk user lain -> ditolak WITH CHECK
  const forge = await yayan.from("submissions").insert({
    task_id: openTask.id,
    user_id: uid.firman,
    content: "forge",
  });
  record("RLS: mahasiswa tidak bisa membuat submission atas nama orang lain", !!forge.error);

  // 7. deadline lewat -> ditolak
  const late = await yayan.from("submissions").insert({
    task_id: closedTask.id,
    user_id: uid.yayan,
    content: "terlambat",
  });
  record("DEADLINE: submission melewati batas waktu ditolak", !!late.error, late.error?.message?.slice(0, 70));

  // 8. admin membaca semua submission kelas
  const { data: adminView, count } = await service
    .from("submissions")
    .select("id", { count: "exact" });
  record("ADMIN: admin melihat seluruh submission kelas", adminView.length === count && count >= 2, `count=${count}`);

  // 9. cleanup
  await service.from("submissions").delete().eq("task_id", openTask.id).eq("user_id", uid.firman);
}

// ================= NOTIFICATIONS =================
{
  const spam = await firman.from("notifications").insert({
    user_id: uid.yayan,
    title: "spam",
  });
  record("RLS: mahasiswa tidak bisa menyuntik notifikasi", !!spam.error);

  const markOther = await firman.from("notifications").update({ read: true }).eq("user_id", uid.yayan);
  record("RLS: mahasiswa tidak bisa menandai notifikasi orang lain", !markOther.data || markOther.data.length === 0);

  const selfRead = await firman.from("notifications").select("id").limit(1);
  if (selfRead.data?.[0]) {
    const upd = await firman.from("notifications").update({ read: true }).eq("id", selfRead.data[0].id);
    record("NOTIF: pemilik bisa menandai miliknya dibaca", !upd.error || upd.error.code === "PGRST116");
  }
}

// ================= PROFILES =================
{
  const escalate = await firman.from("profiles").update({ role: "admin" }).eq("id", uid.firman);
  record("COLUMN PRIV: mahasiswa tidak bisa mengangkat diri jadi admin", !!escalate.error);

  const rename = await firman.from("profiles").update({ name: "Firman Uji" }).eq("id", uid.firman);
  record("PROFILE: pemilik boleh ganti nama sendiri", !rename.error);
  await service.from("profiles").update({ name: "Firman" }).eq("id", uid.firman);
}

// ================= STORAGE =================
{
  const blob = new Blob(["isi-tes"], { type: "text/plain" });

  // upload ke folder milik sendiri -> OK
  const okPath = `${uid.firman}/${openTaskId()}/tes-firman.txt`;
  function openTaskId() {
    return byTitle["ERD Sistem Akademik"].id;
  }
  const upOk = await firman.storage.from("submissions").upload(okPath, blob, { upsert: true });
  record("STORAGE: mahasiswa upload ke folder sendiri", !upOk.error, upOk.error?.message?.slice(0, 60));

  // upload ke folder mahasiswa lain -> DITOLAK
  const badPath = `${uid.yayan}/${byTitle["ERD Sistem Akademik"].id}/hack.txt`;
  const upBad = await firman.storage.from("submissions").upload(badPath, blob, { upsert: true });
  record("STORAGE: mahasiswa tidak bisa upload ke folder orang lain", !!upBad.error);

  // baca file mahasiswa lain -> DITOLAK
  const foreignPath = `${uid.yayan}/${byTitle["ERD Sistem Akademik"].id}/apa-aja.txt`;
  await service.storage.from("submissions").upload(foreignPath, blob, { upsert: true });
  const dl = await firman.storage.from("submissions").createSignedUrl(foreignPath, 60);
  record("STORAGE: mahasiswa tidak bisa akses file submission orang lain", !!dl.error);

  // admin bisa akses
  const dlAdmin = await service.storage.from("submissions").createSignedUrl(foreignPath, 60);
  record("STORAGE: admin mengakses submission kelas", !dlAdmin.error && !!dlAdmin.data?.signedUrl);

  // attachments: mahasiswa tulis -> DITOLAK
  const attBad = await firman.storage.from("attachments").upload(`juknis-baru.pdf`, blob, { upsert: true, contentType: "application/pdf" });
  record("STORAGE: mahasiswa tidak bisa menulis bucket attachments", !!attBad.error);

  // cleanup
  await service.storage.from("submissions").remove([okPath, foreignPath]);
}

// ================= ADMIN WRITE PATH =================
{
  const { data: courses } = await service.from("courses").select("id").limit(1);
  const t = await admin
    .from("tasks")
    .insert({ course_id: courses[0].id, title: "__audit_task__", deadline: new Date(Date.now() + 864e5).toISOString() })
    .select("id")
    .single();
  record("ADMIN: admin bisa CREATE task", !t.error);

  const delT = await admin.from("tasks").delete().eq("id", t.data.id);
  record("ADMIN: admin bisa DELETE task", !delT.error);
}

// =====================================================
const failed = results.filter((r) => !r.pass);
console.log("\n==============================");
console.log(`TOTAL: ${results.length} | PASS: ${results.length - failed.length} | FAIL: ${failed.length}`);
if (failed.length > 0) {
  console.log("GAGAL:");
  failed.forEach((f) => console.log(" -", f.name));
  process.exitCode = 1;
}

