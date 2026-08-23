# ClassFlow

> **Satu kelas. Semua tugas. Tidak ada lagi “deadline-nya kapan?”.**

Aplikasi manajemen tugas satu kelas: dashboard deadline terdekat, status tugas per
mahasiswa, checklist, kalender akademik, kelompok, pengumuman, notifikasi realtime,
dan pengumpulan tugas (submission) dengan feedback.

**Manage your class. Finish your tasks.**

## Stack

- **Next.js 16** (App Router, Turbopack) + **TypeScript**
- **Tailwind CSS v4** + shadcn/ui (Base UI) + Lucide Icons — UI Bahasa Indonesia
- **Supabase**: Auth (`@supabase/ssr`), Postgres + RLS, Storage, Realtime

## Role

| Kemampuan | Admin | Mahasiswa |
| --- | :---: | :---: |
| Melihat tugas/kalender/mata kuliah/kelompok/pengumuman | ✓ | ✓ |
| Update status & catatan pribadi | ✓ | ✓ |
| Checklist tugas | ✓ | ✓ |
| Kirim/revisi submission | – | ✓ |
| CRUD tugas, mata kuliah, pengumuman, kelompok | ✓ | – |
| Kelola anggota kelas | ✓ | – |
| Lihat semua submission + beri feedback/nilai | ✓ | – |
| Statistik progres kelas | ✓ | – |

## Menjalankan Lokal

```bash
npm install
cp .env.example .env.local   # isi kredensial Supabase kamu
node scripts/db.mjs supabase/schema.sql   # inisialisasi schema + RLS
npx tsx supabase/seed.ts                  # data contoh (opsional)
npm run dev
```

## Script Penting

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` / `build` / `start` | Development & produksi |
| `npm run lint` | ESLint |
| `node scripts/db.mjs supabase/schema.sql` | Apply schema ke Supabase |
| `npx tsx supabase/seed.ts` | Seed akun & data demo |
| `npx tsx scripts/security-test.mjs` | Uji RLS + column privileges + storage (31 kasus) |
| `node scripts/smoke-auth.mjs` | Smoke test halaman ter-autentikasi |

## Arsitektur Singkat

- **Status per mahasiswa** disimpan di `user_task_status` (bukan global per tugas);
  `Terlambat` dihitung dari deadline vs waktu sekarang.
- **Checklist bersifat global per tugas** sebagai alat bantu visual — bukan sumber status.
- **Submission diamankan defense-in-depth**: UI → server action (cek role & window
  waktu) → RLS policies → column privileges (mahasiswa tidak bisa menyentuh kolom
  `status`, `feedback`, `graded_at`; grading hanya lewat admin client server-side).
- **Storage dua bucket**: `attachments` (admin tulis) dan `submissions`
  (folder per user; hanya pemilik & admin yang bisa membaca).
- Notifikasi realtime via Supabase Realtime pada tabel `notifications`.

## Deploy ke Vercel

1. Push repo ini lalu import di Vercel.
2. Set environment variables (lihat `.env.example`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY` *(server only)*
3. Deploy — tanpa konfigurasi tambahan.
