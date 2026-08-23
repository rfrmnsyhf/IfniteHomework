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

function at(daysFromNow: number, hour = 23, minute = 59): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const USERS = [
  { email: "admin@classflow.id", password: "AdminFlow2026!", name: "Admin Kelas", role: "admin" },
  { email: "firman@classflow.id", password: "Mahasiswa2026!", name: "Firman", role: "mahasiswa" },
  { email: "yayan@classflow.id", password: "Mahasiswa2026!", name: "Yayan", role: "mahasiswa" },
];

async function ensureUser(u: (typeof USERS)[number]): Promise<string> {
  const { data } = await admin.auth.admin.listUsers();
  const existing = data?.users.find((x) => x.email === u.email);
  if (existing) return existing.id;
  const { data: created, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { name: u.name, role: u.role },
  });
  if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
  return created.user!.id;
}

async function main() {
  console.log("Seeding users...");
  const userIds: Record<string, string> = {};
  for (const u of USERS) {
    userIds[u.name] = await ensureUser(u);
    console.log("  user ok:", u.email);
  }

  // pastikan profile terbentuk oleh trigger
  await new Promise((r) => setTimeout(r, 1500));
  const { data: profs } = await admin.from("profiles").select("id, email, role");
  for (const u of USERS) {
    if (!profs?.some((p) => p.id === userIds[u.name])) {
      throw new Error(`profile missing for ${u.email} (trigger?)`);
    }
  }

  // ---------- kelas ----------
  let classId: string | undefined;
  {
    const { data } = await admin.from("classes").select("id").eq("code", "SI-6A").maybeSingle();
    if (data) {
      classId = data.id;
    } else {
      const { data: created, error } = await admin
        .from("classes")
        .insert({ name: "Sistem Informasi", code: "SI-6A", semester: 6, academic_year: "2026/2027" })
        .select("id")
        .single();
      if (error) throw error;
      classId = created!.id;
    }
  }
  console.log("class SI-6A:", classId);

  const memberRows = Object.values(userIds).map((uid) => ({ class_id: classId!, user_id: uid }));
  await admin.from("class_members").upsert(memberRows, { ignoreDuplicates: true });

  // ---------- mata kuliah ----------
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
      .eq("class_id", classId!)
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
  console.log("courses:", Object.keys(courseIds).length);

  // ---------- tugas ----------
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
  const adminUid = userIds["Admin Kelas"];
  const students = [userIds["Firman"], userIds["Yayan"]];

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
  console.log("tasks:", Object.keys(taskIds).length);

  // assignment: seluruh mahasiswa kelas mengerjakan semua tugas
  const assignRows = Object.values(taskIds).flatMap((tid) =>
    students.map((sid) => ({ task_id: tid, user_id: sid }))
  );
  await admin.from("task_assignments").upsert(assignRows, { ignoreDuplicates: true });

  // ---------- checklist ----------
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
  console.log("checklists ok");

  // ---------- status personal ----------
  const UTS: Array<[string, string, "belum_dikerjakan" | "sedang_dikerjakan" | "menunggu_review" | "selesai", string]> = [
    ["inventory-api", "Firman", "sedang_dikerjakan", "Endpoint create & read sudah jalan, lanjut update/delete."],
    ["searching-algo", "Firman", "belum_dikerjakan", ""],
    ["normalisasi-db", "Firman", "selesai", ""],
    ["ml-report", "Firman", "selesai", ""],
    ["quiz-bdl", "Firman", "selesai", ""],
    ["searching-algo", "Yayan", "sedang_dikerjakan", "Skema BFS selesai, tinggal A*."],
    ["normalisasi-db", "Yayan", "sedang_dikerjakan", "1NF dan 2NF selesai."],
    ["quiz-bdl", "Yayan", "selesai", ""],
  ];
  for (const [key, who, status, notes] of UTS) {
    await admin.from("user_task_status").upsert({
      task_id: taskIds[key],
      user_id: userIds[who],
      status,
      notes,
    });
  }
  console.log("user_task_status ok");

  // ---------- kelompok ----------
  {
    const { data: found } = await admin.from("groups").select("id").eq("name", "Kelompok 1").maybeSingle();
    if (!found) {
      const { data: g, error } = await admin
        .from("groups")
        .insert({
          class_id: classId!,
          name: "Kelompok 1",
          project_title: "Aplikasi Presensi",
          description: "Aplikasi presensi berbasis mobile dengan QR code.",
        })
        .select("id")
        .single();
      if (error) throw error;
      await admin.from("group_members").insert([
        { group_id: g!.id, user_id: userIds["Firman"], role_in_group: "Backend" },
        { group_id: g!.id, user_id: userIds["Yayan"], role_in_group: "Frontend" },
      ]);
    }
  }
  console.log("groups ok");

  // ---------- pengumuman ----------
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
      await admin.from("announcements").insert({ ...a, class_id: classId!, created_by: adminUid });
    }
  }
  console.log("announcements ok");

  // ---------- submissions ----------
  const mlTask = taskIds["ml-report"];
  const ndTask = taskIds["normalisasi-db"];
  {
    const { data: s1 } = await admin
      .from("submissions")
      .select("id")
      .eq("task_id", mlTask)
      .eq("user_id", userIds["Firman"])
      .maybeSingle();
    if (!s1) {
      await admin.from("submissions").insert({
        task_id: mlTask,
        user_id: userIds["Firman"],
        content: "Model Random Forest, akurasi 96.7%. Confusion matrix terlampir di report.",
        file_url: "ml-report-firman.pdf",
        storage_path: `${userIds["Firman"]}/${mlTask}/ml-report-firman.pdf`,
        status: "graded",
        feedback: "Analisis algoritma sudah baik. Tambahkan perbandingan kompleksitas waktu antar model.",
        graded_at: at(0, 10),
        submitted_at: at(-5, 21),
      });
    }
    const { data: s2 } = await admin
      .from("submissions")
      .select("id")
      .eq("task_id", ndTask)
      .eq("user_id", userIds["Firman"])
      .maybeSingle();
    if (!s2) {
      await admin.from("submissions").insert({
        task_id: ndTask,
        user_id: userIds["Firman"],
        content: "Skema penjualan ternormalisasi hingga 3NF beserta proses decomposisi.",
        file_url: "normalisasi-firman.docx",
        storage_path: `${userIds["Firman"]}/${ndTask}/normalisasi-firman.docx`,
        status: "submitted",
        submitted_at: at(-1, 14),
      });
    }
  }
  console.log("submissions ok");

  // ---------- notifikasi ----------
  const invTask = taskIds["inventory-api"];
  const NOTIFS = [
    { who: "Firman", title: 'Deadline "REST API Inventory" tinggal 1 hari', body: "Selesaikan sebelum 23:59 besok.", link: `/tugas/${invTask}`, read: false, ago_h: 2 },
    { who: "Firman", title: 'Feedback baru untuk "Machine Learning Report"', body: "Analisis algoritma sudah baik...", link: `/tugas/${mlTask}`, read: false, ago_h: 26 },
    { who: "Yayan", title: 'Deadline "Searching Algorithm Report" tinggal 1 hari', body: "Status masih Sedang Dikerjakan.", link: `/tugas/${taskIds["searching-algo"]}`, read: false, ago_h: 3 },
    { who: "Yayan", title: 'Tugas baru ditambahkan: "Machine Learning Report"', body: "Kecerdasan Buatan", link: `/tugas/${mlTask}`, read: true, ago_h: 100 },
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
  console.log("notifications ok");
  console.log("\nSEED SELESAI.");
  console.log("Akun:");
  console.log("  admin@classflow.id / AdminFlow2026!");
  console.log("  firman@classflow.id / Mahasiswa2026!");
  console.log("  yayan@classflow.id / Mahasiswa2026!");
}

main().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});
