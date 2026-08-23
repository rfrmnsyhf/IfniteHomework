/**
 * Smoke test halaman ter-autentikasi (server produksi lokal).
 * Membuat sesi via auth API, membangun cookie @supabase/ssr,
 * lalu me-render halaman utama dan memeriksa kontennya.
 *
 * Jalankan: node scripts/smoke-auth.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of raw.split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUB = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const ref = URL_.match(/https:\/\/([^.]+)\./)[1];

function b64url(str) {
  return Buffer.from(str, "utf8").toString("base64url");
}

async function cookieFor(email, password) {
  const c = createClient(URL_, PUB, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const value = "base64-" + b64url(JSON.stringify(data.session));
  return `sb-${ref}-auth-token=${encodeURIComponent(value)}`;
}

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
let failures = 0;

async function check(label, path, cookie, expect) {
  try {
    const res = await fetch(BASE + path, {
      headers: cookie ? { cookie } : {},
      redirect: "manual",
    });
    const html = res.status === 200 ? await res.text() : "";
    const ok =
      (expect.status ? res.status === expect.status : true) &&
      (!expect.contains || html.includes(expect.contains));
    console.log(`${ok ? "PASS" : "FAIL"} | ${label} -> ${res.status}${expect.contains ? ` | contains "${expect.contains}": ${html.includes(expect.contains)}` : ""}`);
    if (!ok) failures++;
  } catch (e) {
    console.log(`FAIL | ${label} -> ${e.message}`);
    failures++;
  }
}

const firmanCookie = await cookieFor("firman@classflow.id", "Mahasiswa2026!");
const adminCookie = await cookieFor("admin@classflow.id", "AdminFlow2026!");

await check("Mahasiswa: /dashboard", "/dashboard", firmanCookie, {
  contains: "Progress Kamu",
});
await check("Mahasiswa: /dashboard stat", "/dashboard", firmanCookie, {
  contains: "Tugas Aktif",
});
await check("Mahasiswa: /dashboard deadline section", "/dashboard", firmanCookie, {
  contains: "Deadline Terdekat",
});
await check("Mahasiswa: /tugas", "/tugas", firmanCookie, {
  contains: "REST API Inventory",
});
await check("Mahasiswa: /kalender", "/kalender", firmanCookie, {
  contains: "Kalender Akademik",
});
await check("Mahasiswa: /pengumuman", "/pengumuman", firmanCookie, {
  contains: "Perubahan Deadline",
});
await check("Admin: /dashboard progres kelas", "/dashboard", adminCookie, {
  contains: "Progres Kelas",
});

// detail tugas pertama milik firman
{
  const service = createClient(URL_, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false },
  });
  const { data: t } = await service.from("tasks").select("id").eq("title", "REST API Inventory").single();
  await check("Mahasiswa: /tugas/[id] detail + checklist", `/tugas/${t.id}`, firmanCookie, {
    contains: "Checklist",
  });
  await check("Admin: /tugas/[id] submissions manager", `/tugas/${t.id}`, adminCookie, {
    contains: "Submission",
  });
}

console.log(failures === 0 ? "\nSMOKE OK" : `\nSMOKE GAGAL: ${failures}`);
process.exitCode = failures === 0 ? 0 : 1;
