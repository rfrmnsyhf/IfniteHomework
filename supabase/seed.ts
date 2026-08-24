/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;

const admin = createClient(SUPABASE_URL, SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Helper to convert DD-Mon-YY to YYYY-MM-DD
function parseDate(dateStr: string): string {
  const [day, monthStr, yearStr] = dateStr.split("-");
  const dayNum = parseInt(day, 10);
  const year = 2000 + parseInt(yearStr, 10); // Assuming 20xx
  const monthMap: Record<string, number> = {
    Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Mei: 5, Jun: 6,
    Jul: 7, Aug: 8, Agu: 8, Sep: 9, Oct: 10, Okt: 10, Nov: 11, Dec: 12, Des: 12
  };
  const month = monthMap[monthStr];
  if (!month) throw new Error(`Invalid month: ${monthStr}`);
  return `${year}-${month.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
}

// Parse datamahasiswa.txt — line-by-line, CRLF-safe
function parseStudents(): Array<{ nim: string; name: string; role: "admin" | "mahasiswa"; alamat: string; no_hp: string; jenis_kelamin: string; tempat_lahir: string; tgl_lahir: string; password: string }> {
  const content = readFileSync(new URL("../datamahasiswa.txt", import.meta.url), "utf8");
  const lines = content.split("\n").map((l) => l.replace(/\r/g, "").trimEnd());
  const students: any[] = [];
  let cur: any = {};
  const flush = () => {
    if (cur.nim && cur.name && cur.role && cur.alamat !== undefined && cur.no_hp !== undefined && cur.jenis_kelamin !== undefined && cur.tempat_lahir !== undefined && cur.tgl_lahir !== undefined && cur.password !== undefined) students.push(cur);
    cur = {};
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { if (cur.nim) flush(); continue; }
    if (line.startsWith("NIM:")) cur.nim = line.split(":").slice(1).join(":").trim();
    else if (line.startsWith("Nama:")) cur.name = line.split(":").slice(1).join(":").trim();
    else if (line.startsWith("Role:")) cur.role = line.split(":").slice(1).join(":").trim().toLowerCase();
    else if (line.startsWith("Alamat:")) cur.alamat = line.split(":").slice(1).join(":").trim();
    else if (line.startsWith("No HP:")) cur.no_hp = line.split(":").slice(1).join(":").trim();
    else if (line.startsWith("Jenis Kelamin:")) cur.jenis_kelamin = line.split(":").slice(1).join(":").trim();
    else if (line.startsWith("Tempat Lahir:")) cur.tempat_lahir = line.split(":").slice(1).join(":").trim();
    else if (line.startsWith("Tanggal Lahir:")) cur.tgl_lahir = parseDate(line.split(":").slice(1).join(":").trim());
    else if (line.startsWith("Password Default:")) cur.password = line.split(":").slice(1).join(":").trim();
  }
  flush();
  return students;
}

// Delete old dummy users
async function deleteOldUsers(): Promise<void> {
  const oldEmails = ["admin@classflow.id", "firman@classflow.id", "yayan@classflow.id"];
  const { data } = await admin.auth.admin.listUsers({ perPage: 100 });
  for (const u of data?.users ?? []) {
    if (u.email && oldEmails.includes(u.email.toLowerCase())) {
      await admin.auth.admin.deleteUser(u.id);
      console.log(`Deleted old user: ${u.email}`);
    }
  }
}

// Create Auth users
async function createAuthUsers(students: any[]): Promise<Record<string, string>> {
  const userIds: Record<string, string> = {};

  // idempotent: if NIM already exists, reuse existing id
  const { data: existingUsers } = await admin.auth.admin.listUsers({ perPage: 100 });
  for (const student of students) {
    const email = `${student.nim}@classflow.local`;
    const existing = existingUsers?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (existing) { userIds[student.nim] = existing.id; console.log(`Reused existing: ${email}`); continue; }
    try {
      const { data: created, error } = await admin.auth.admin.createUser({
        email, password: student.password, email_confirm: true,
        user_metadata: { name: student.name, nim: student.nim, role: student.role },
      });
      if (error) throw error;
      if (!created.user) throw new Error("No user returned");
      userIds[student.nim] = created.user.id;
      console.log(`Created user: ${email}`);
    } catch (err: any) {
      if (String(err?.message ?? err).toLowerCase().includes("already")) {
        const { data: refetch } = await admin.auth.admin.listUsers({ perPage: 100 });
        const found = refetch?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
        if (found) { userIds[student.nim] = found.id; continue; }
      }
      console.error(`Failed to create user ${email}:`, err);
      throw err;
    }
  }

  return userIds;
}

// Update profiles with sensitive data
async function updateProfiles(students: any[]): Promise<void> {
  const updates = students.map((s) => ({
    nim: s.nim,
    alamat: s.alamat,
    no_hp: s.no_hp,
    jenis_kelamin: s.jenis_kelamin,
    tempat_lahir: s.tempat_lahir,
    tgl_lahir: s.tgl_lahir,
  }));

  for (const update of updates) {
    try {
      await admin
        .from("profiles")
        .update(update)
        .eq("nim", update.nim);
      console.log(`Updated profile for NIM: ${update.nim}`);
    } catch (err) {
      console.error(`Failed to update profile for NIM ${update.nim}:`, err);
      throw err;
    }
  }
}

// Insert class (should already exist from previous seed)
async function ensureClass(): Promise<string> {
  const { data: found } = await admin
    .from("classes")
    .select("id")
    .eq("code", "SI-6A")
    .maybeSingle();

  if (found) return found.id;

  const { data: created, error } = await admin
    .from("classes")
    .insert({
      name: "Sistem Informasi 6A",
      code: "SI-6A",
      semester: 6,
      academic_year: "2026/2027",
    })
    .select("id")
    .single();

  if (error) throw error;
  if (!created) throw new Error("Failed to create class");

  return created.id;
}

// Insert class_members
async function insertClassMembers(
  classId: string,
  userIds: Record<string, string>
): Promise<void> {
  const memberRows = Object.values(userIds).map((uid) => ({
    class_id: classId,
    user_id: uid,
  }));

  await admin.from("class_members").upsert(memberRows, { ignoreDuplicates: true });
}

// Insert courses, tasks, checklists, etc. (reusing structure from old seed)
async function seedTestData(
  classId: string,
  userIds: Record<string, string>
): Promise<void> {
  // Reuse much of the original seed logic but adapted for new structure
  const at = (daysFromNow: number, hour = 23, minute = 59): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  // Insert courses
  const COURSES = [
    { name: "Pemrograman VI", lecturer_name: "Dr. Budi Santoso", color: "#6366f1" },
    { name: "Kecerdasan Buatan", lecturer_name: "Dr. Siti Rahma", color: "#f59e0b" },
    { name: "Manajemen Komunikasi", lecturer_name: "Prof. Andi Wijaya", color: "#10b981" },
    { name: "Basis Data Lanjut", lecturer_name: "Dr. Rina Marlina", color: "#ef4444" },
  ];
  const courseIds: Record<string, string> = {};

  for (const c of COURSES) {
    const { data: found } = await admin
      .from("courses")
      .select("id")
      .eq("class_id", classId)
      .eq("name", c.name)
      .maybeSingle();

    if (found) {
      courseIds[c.name] = found.id;
      continue;
    }

    const { data: created, error } = await admin
      .from("courses")
      .insert({ ...c, class_id: classId })
      .select("id")
      .single();

    if (error) throw error;
    courseIds[c.name] = created!.id;
  }

  // Insert tasks (same as original seed)
  type T = {
    key: string;
    course: string;
    title: string;
    description: string;
    deadline: string;
    priority: "rendah" | "sedang" | "tinggi";
    type: "individu" | "kelompok";
  };
  const TASKS: T[] = [
    { key: "inventory-api", course: "Pemrograman VI", title: "REST API Inventory", description: "Buat REST API menggunakan Express JS dan Prisma dengan fitur CRUD inventory. Lengkapi dengan validasi input dan dokumentasi endpoint.", deadline: at(1), priority: "tinggi", type: "individu" },
    { key: "searching-algo", course: "Kecerdasan Buatan", title: "Searching Algorithm Report", description: "Bandingkan algoritma BFS, DFS, dan A* pada grid pathfinding. Sertakan analisis kompleksitas dan visualisasi hasil eksperimen.", deadline: at(1, 20, 0), priority: "sedang", type: "individu" },
    { key: "makalah-komunikasi", course: "Manajemen Komunikasi", title: "Makalah Komunikasi Efektif", description: "Makalah kelompok 8-12 halaman tentang komunikasi efektif dalam tim pengembangan software. Format APA.", deadline: at(3, 20, 0), priority: "rendah", type: "kelompok" },
    { key: "normalisasi-db", course: "Basis Data Lanjut", title: "Normalisasi Database", description: "Normalisasikan skema sistem penjualan hingga bentuk 3NF. Lampirkan proses decomposisi tiap tahap.", deadline: at(6), priority: "sedang", type: "individu" },
    { key: "presensi-ui", course: "Pemrograman VI", title: "Presensi Mobile UI", description: "Rancang UI aplikasi presensi mobile (figma/react native). Minimal: login, dashboard, riwayat presensi, QR scan.", deadline: at(9), priority: "tinggi", type: "kelompok" },
    { key: "a-star", course: "Kecerdasan Buatan", title: "Implementasi A* Pathfinding", description: "Implementasikan A* pada peta grid 20x20 dengan heuristik manhattan dan euclidean. Bandingkan jumlah node yang dieksplorasi.", deadline: at(12), priority: "sedang", type: "kelompok" },
    { key: "erd-akademik", course: "Basis Data Lanjut", title: "ERD Sistem Akademik", description: "Buat ERD lengkap sistem akademik (mahasiswa, dosen, mata kuliah, nilai, jadwal) beserta kamus data.", deadline: at(15), priority: "rendah", type: "individu" },
    { key: "public-speaking", course: "Manajemen Komunikasi", title: "Presentasi Public Speaking", description: "Rekam video presentasi 7 menit tema bebas dengan teknik storytelling. Unggah tautan video.", deadline: at(17), priority: "sedang", type: "individu" },
    { key: "final-proposal", course: "Pemrograman VI", title: "Final Project Proposal", description: "Proposal proyek akhir: latar belakang, rumusan masalah, tech stack, arsitektur sistem, timeline.", deadline: at(22), priority: "tinggi", type: "kelompok" },
    { key: "ml-report", course: "Kecerdasan Buatan", title: "Machine Learning Report", description: "Latih model klasifikasi pada dataset iris/titanic. Laporkan preprocessing, split data, akurasi, dan confusion matrix.", deadline: at(-4), priority: "sedang", type: "individu" },
    { key: "quiz-bdl", course: "Basis Data Lanjut", title: "Persiapan Quiz 1", description: "Materi quiz: transaksi, ACID, concurrency control, dan recovery.", deadline: at(-2), priority: "rendah", type: "individu" },
    { key: "refleksi-video", course: "Manajemen Komunikasi", title: "Refleksi Diri Video", description: "Video refleksi 3 menit: komunikasi interpersonal selama semester ini.", deadline: at(27), priority: "rendah", type: "individu" },
  ];

  const taskIds: Record<string, string> = {};
  // ponytail: pick first admin by NIM list, falls back to first user
  const adminNims = ["1224401", "1224404", "1224405", "1224408"];
  const adminUid = adminNims.map((n) => userIds[n]).find(Boolean) ?? Object.values(userIds)[0];
  const allUids = Object.values(userIds);

  for (const t of TASKS) {
    const payload = {
      course_id: courseIds[t.course],
      title: t.title,
      description: t.description,
      deadline: t.deadline,
      priority: t.priority,
      type: t.type,
      allow_submission: true,
      created_by: adminUid,
    };
    const { data: found } = await admin
      .from("tasks")
      .select("id")
      .eq("course_id", payload.course_id)
      .eq("title", t.title)
      .maybeSingle();

    if (found) {
      taskIds[t.key] = found.id;
      continue;
    }

    const { data: created, error } = await admin.from("tasks").insert(payload).select("id").single();
    if (error) throw error;
    taskIds[t.key] = created!.id;
  }

  // Assignment: all 14 students do all tasks
  const assignRows = Object.values(taskIds).flatMap((tid) =>
    allUids.map((sid: string) => ({ task_id: tid, user_id: sid }))
  );
  await admin.from("task_assignments").upsert(assignRows, { ignoreDuplicates: true });

  // Insert checklists
  const CHECKLISTS: Record<string, Array<[string, boolean]>> = {
    "inventory-api": [
      ["Setup Express", true],
      ["Setup Prisma", true],
      ["Membuat endpoint CRUD", false],
      ["Testing API", false],
      ["Dokumentasi", false],
    ],
    "presensi-ui": [
      ["Wireframe UI", true],
      ["Komponen dasar", false],
      ["Integrasi API", false],
    ],
    "final-proposal": [
      ["Judul proposal", false],
      ["Outline bab", false],
      ["Draft awal", false],
    ],
  };
  for (const [key, items] of Object.entries(CHECKLISTS)) {
    const { data: found } = await admin.from("checklists").select("id").eq("task_id", taskIds[key]).limit(1);
    if (found && found.length > 0) continue;
    await admin.from("checklists").insert(
      items.map(([title, completed], i) => ({
        task_id: taskIds[key],
        title,
        completed,
        sort_order: i,
      }))
    );
  }

  // Insert user_task_status — use real NIMs (1224405=R.Firmansyah, 1220005=Rendi)
  const UTS: Array<[string, string, "belum_dikerjakan" | "sedang_dikerjakan" | "menunggu_review" | "selesai", string]> = [
    ["inventory-api", "1224405", "sedang_dikerjakan", "Endpoint create & read sudah jalan, lanjut update/delete."],
    ["searching-algo", "1224405", "belum_dikerjakan", ""],
    ["normalisasi-db", "1224405", "selesai", ""],
    ["ml-report", "1224405", "selesai", ""],
    ["quiz-bdl", "1224405", "selesai", ""],
    ["searching-algo", "1220005", "sedang_dikerjakan", "Skema BFS selesai, tinggal A*."],
    ["normalisasi-db", "1220005", "sedang_dikerjakan", "1NF dan 2NF selesai."],
    ["quiz-bdl", "1220005", "selesai", ""],
  ];
  for (const [key, nim, status, notes] of UTS) {
    await admin.from("user_task_status").upsert({ task_id: taskIds[key], user_id: userIds[nim], status, notes });
  }

  // Insert groups
  const { data: gFound } = await admin.from("groups").select("id").eq("name", "Kelompok 1").maybeSingle();
  if (!gFound) {
    const { data: g, error } = await admin
      .from("groups")
      .insert({
        class_id: classId,
        name: "Kelompok 1",
        project_title: "Aplikasi Presensi",
        description: "Aplikasi presensi berbasis mobile dengan QR code.",
      })
      .select("id")
      .single();
    if (error) throw error;
    await admin.from("group_members").insert([
      { group_id: g!.id, user_id: userIds["1224405"], role_in_group: "Backend" },
      { group_id: g!.id, user_id: userIds["1220005"], role_in_group: "Frontend" },
    ]);
  }

  // Insert announcements
  const ANNOUNCEMENTS = [
    {
      title: "Perubahan Deadline: REST API Inventory",
      content: "Deadline REST API Inventory diundur menjadi 25 Agustus pukul 23:59. Mohon gunakan waktu tambahan ini untuk menyelesaikan testing API.",
    },
    {
      title: "Jadwal Lab Tambahan",
      content: "Lab komputer tersedia tambahan hari Sabtu pukul 09:00-12:00 untuk pengerjaan tugas kelompok. Koordinasi melalui ketua kelompok.",
    },
  ];
  for (const a of ANNOUNCEMENTS) {
    const { data: found } = await admin.from("announcements").select("id").eq("title", a.title).maybeSingle();
    if (!found) {
      await admin.from("announcements").insert({ ...a, class_id: classId, created_by: adminUid });
    }
  }

  // Insert submissions
  const mlTask = taskIds["ml-report"];
  const ndTask = taskIds["normalisasi-db"];
  {
    const { data: s1 } = await admin.from("submissions").select("id").eq("task_id", mlTask).eq("user_id", userIds["1224405"]).maybeSingle();
    if (!s1) {
      await admin.from("submissions").insert({
        task_id: mlTask, user_id: userIds["1224405"], content: "Model Random Forest, akurasi 96.7%. Confusion matrix terlampir di report.",
        file_url: "ml-report-firman.pdf", storage_path: `${userIds["1224405"]}/${mlTask}/ml-report-firman.pdf`,
        status: "graded", feedback: "Analisis algoritma sudah baik. Tambahkan perbandingan kompleksitas waktu antar model.", graded_at: at(0, 10), submitted_at: at(-5, 21),
      });
    }
    const { data: s2 } = await admin.from("submissions").select("id").eq("task_id", ndTask).eq("user_id", userIds["1224405"]).maybeSingle();
    if (!s2) {
      await admin.from("submissions").insert({
        task_id: ndTask, user_id: userIds["1224405"], content: "Skema penjualan ternormalisasi hingga 3NF beserta proses decomposisi.",
        file_url: "normalisasi-firman.docx", storage_path: `${userIds["1224405"]}/${ndTask}/normalisasi-firman.docx`, status: "submitted", submitted_at: at(-1, 14),
      });
    }
  }

  // Insert notifications
  const invTask = taskIds["inventory-api"];
  const NOTIFS = [
    { who: "1224405", title: 'Deadline "REST API Inventory" tinggal 1 hari', body: "Selesaikan sebelum 23:59 besok.", link: `/tugas/${invTask}`, read: false, ago_h: 2 },
    { who: "1224405", title: 'Feedback baru untuk "Machine Learning Report"', body: "Analisis algoritma sudah baik...", link: `/tugas/${mlTask}`, read: false, ago_h: 26 },
    { who: "1220005", title: 'Deadline "Searching Algorithm Report" tinggal 1 hari', body: "Status masih Sedang Dikerjakan.", link: `/tugas/${taskIds["searching-algo"]}`, read: false, ago_h: 3 },
    { who: "1220005", title: 'Tugas baru ditambahkan: "Machine Learning Report"', body: "Kecerdasan Buatan", link: `/tugas/${mlTask}`, read: true, ago_h: 100 },
  ];
  for (const n of NOTIFS) {
    const { data: found } = await admin
      .from("notifications")
      .select("id")
      .eq("user_id", userIds[n.who])
      .eq("title", n.title)
      .maybeSingle();
    if (found) continue;
    const d = new Date();
    d.setHours(d.getHours() - n.ago_h);
    await admin.from("notifications").insert({
      user_id: userIds[n.who],
      title: n.title,
      body: n.body,
      link: n.link,
      read: n.read,
      created_at: d.toISOString(),
    });
  }
}

// Main seeding function
async function main() {
  console.log("Starting seed process...");

  // Parse students from datamahasiswa.txt
  const students = parseStudents();
  console.log(`Parsed ${students.length} students from datamahasiswa.txt`);

  // Delete old dummy users
  await deleteOldUsers();
  console.log("Old dummy users deleted");

  // Create Auth users
  const userIds = await createAuthUsers(students);
  console.log(`Created ${Object.keys(userIds).length} Auth users`);

  // Wait for trigger to create profiles
  console.log("Waiting for trigger to create profiles...");
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Update profiles with sensitive data
  await updateProfiles(students);
  console.log("Profiles updated with sensitive data");

  // Ensure class exists
  const classId = await ensureClass();
  console.log(`Class ensured: ${classId}`);

  // Insert class_members
  await insertClassMembers(classId, userIds);
  console.log("Class members inserted");

  // Seed test data (courses, tasks, checklists, etc.)
  await seedTestData(classId, userIds);
  console.log("Test data seeded");

  console.log("\n✅ SEED COMPLETE! 14 users ready (passwords = NIM, not logged).");
  // ponytail: don't log plaintext passwords
}

main().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});