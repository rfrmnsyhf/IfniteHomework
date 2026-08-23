-- =============================================================
-- ClassFlow Schema — Next.js + Supabase
-- 15 tabel, RLS (2 role: admin/mahasiswa), column privileges,
-- storage buckets & policies, realtime notifications
-- =============================================================

create extension if not exists pgcrypto;

-- ============================ ENUMS ==========================
create type public.user_role            as enum ('admin', 'mahasiswa');
create type public.task_priority        as enum ('rendah', 'sedang', 'tinggi');
create type public.task_type            as enum ('individu', 'kelompok');
create type public.personal_task_status as enum ('belum_dikerjakan', 'sedang_dikerjakan', 'menunggu_review', 'selesai');
create type public.submission_status    as enum ('submitted', 'revised', 'graded');

-- ========================== PROFILES =========================
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null unique,
  name       text not null,
  role       public.user_role not null default 'mahasiswa',
  avatar_url text,
  created_at timestamptz not null default now()
);

-- =========================== CLASSES =========================
create table public.classes (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  code          text not null unique,
  semester      int  not null,
  academic_year text not null,
  created_at    timestamptz not null default now()
);

create table public.class_members (
  class_id  uuid not null references public.classes  (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

-- =========================== COURSES =========================
create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes (id) on delete cascade,
  name          text not null,
  lecturer_name text,
  color         text,
  created_at    timestamptz not null default now()
);

-- ============================ TASKS ==========================
create table public.tasks (
  id                  uuid primary key default gen_random_uuid(),
  course_id           uuid not null references public.courses (id) on delete cascade,
  title               text not null,
  description         text,
  deadline            timestamptz not null,
  priority            public.task_priority not null default 'sedang',
  type                public.task_type not null default 'individu',
  allow_submission    boolean not null default true,
  submission_deadline timestamptz,
  created_by          uuid references public.profiles (id),
  created_at          timestamptz not null default now()
);

create table public.task_assignments (
  task_id uuid not null references public.tasks    (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (task_id, user_id)
);

-- Status PER MAHASISWA — sumber kebenaran progress personal
create table public.user_task_status (
  task_id   uuid not null references public.tasks    (id) on delete cascade,
  user_id   uuid not null references public.profiles (id) on delete cascade,
  status    public.personal_task_status not null default 'belum_dikerjakan',
  notes     text not null default '',
  updated_at timestamptz not null default now(),
  primary key (task_id, user_id)
);

-- Checklist GLOBAL milik tugas (bukan sumber status individu)
create table public.checklists (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references public.tasks (id) on delete cascade,
  title      text not null,
  completed  boolean not null default false,
  sort_order int not null default 0
);

-- =========================== GROUPS ==========================
create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  class_id      uuid not null references public.classes (id) on delete cascade,
  name          text not null,
  project_title text,
  description   text,
  created_at    timestamptz not null default now()
);

create table public.group_members (
  group_id      uuid not null references public.groups   (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role_in_group text,
  primary key (group_id, user_id)
);

-- =============== ATTACHMENTS (resource dosen/admin) ===========
create table public.attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks (id) on delete cascade,
  filename     text not null,
  storage_path text not null,
  uploaded_by  uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

-- ================ SUBMISSIONS (kiriman mahasiswa) =============
create table public.submissions (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks    (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  content      text,
  file_url     text,
  storage_path text,
  status       public.submission_status not null default 'submitted',
  feedback     text,
  graded_at    timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (task_id, user_id)
);

-- ======================== ANNOUNCEMENTS ======================
create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes (id) on delete cascade,
  title      text not null,
  content    text not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ======================== NOTIFICATIONS ======================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title      text not null,
  body       text,
  link       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========================= INDEXES ===========================
create index idx_courses_class              on public.courses (class_id);
create index idx_tasks_course               on public.tasks (course_id);
create index idx_tasks_deadline             on public.tasks (deadline);
create index idx_task_assign_user           on public.task_assignments (user_id);
create index idx_uts_user                   on public.user_task_status (user_id);
create index idx_checklists_task            on public.checklists (task_id);
create index idx_group_members_user         on public.group_members (user_id);
create index idx_attachments_task           on public.attachments (task_id);
create index idx_submissions_task           on public.submissions (task_id);
create index idx_submissions_user           on public.submissions (user_id);
create index idx_announcements_class_time   on public.announcements (class_id, created_at desc);
create index idx_notifications_user_time    on public.notifications (user_id, created_at desc);

-- ================= HELPER FUNCTIONS (SECURITY DEFINER) =======
-- Menghindari rekursi RLS; hanya membaca data yang dibutuhkan.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.my_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_class_member(p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class and user_id = auth.uid()
  );
$$;

-- Tugas boleh dilihat jika pemanggil anggota kelas pemilik course-nya
create or replace function public.can_read_task(p_task uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.tasks t
    join public.courses c on c.id = t.course_id
    where t.id = p_task
      and (public.is_admin() or public.is_class_member(c.class_id))
  );
$$;

-- Apakah tugas masih menerima submission?
create or replace function public.task_submission_open(p_task uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(allow_submission, false)
         and now() <= coalesce(submission_deadline, deadline)
  from public.tasks where id = p_task;
$$;

-- ================= AUTO-CREATE PROFILE ON SIGNUP =============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'mahasiswa')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ===================== ENABLE RLS (ALL) ======================
alter table public.profiles          enable row level security;
alter table public.classes           enable row level security;
alter table public.class_members     enable row level security;
alter table public.courses           enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_assignments  enable row level security;
alter table public.user_task_status  enable row level security;
alter table public.checklists        enable row level security;
alter table public.groups            enable row level security;
alter table public.group_members     enable row level security;
alter table public.attachments       enable row level security;
alter table public.submissions       enable row level security;
alter table public.announcements     enable row level security;
alter table public.notifications     enable row level security;

-- ======================= POLICIES ============================

-- ---------- profiles ----------
-- Sistem tertutup: semua user terautentikasi boleh melihat profil (nama/avatar)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);

-- Update sendiri, kolom dibatasi via GRANT (email/role tidak bisa diubah)
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (name, avatar_url) on public.profiles to authenticated;

-- ---------- classes ----------
drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes
  for select to authenticated
  using (public.is_admin() or public.is_class_member(id));

drop policy if exists classes_admin_write on public.classes;
create policy classes_admin_write on public.classes
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- class_members ----------
drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin() or public.is_class_member(class_id));

drop policy if exists class_members_admin_write on public.class_members;
create policy class_members_admin_write on public.class_members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- courses ----------
drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses
  for select to authenticated
  using (public.is_admin() or public.is_class_member(class_id));

drop policy if exists courses_admin_write on public.courses;
create policy courses_admin_write on public.courses
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- tasks ----------
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (public.can_read_task(id));

drop policy if exists tasks_admin_write on public.tasks;
create policy tasks_admin_write on public.tasks
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- task_assignments ----------
drop policy if exists task_assignments_select on public.task_assignments;
create policy task_assignments_select on public.task_assignments
  for select to authenticated
  using (public.can_read_task(task_id));

drop policy if exists task_assignments_admin_write on public.task_assignments;
create policy task_assignments_admin_write on public.task_assignments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- user_task_status ----------
drop policy if exists uts_select on public.user_task_status;
create policy uts_select on public.user_task_status
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists uts_write_own on public.user_task_status;
create policy uts_write_own on public.user_task_status
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists uts_update_own on public.user_task_status;
create policy uts_update_own on public.user_task_status
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- checklists (global per tugas) ----------
drop policy if exists checklists_select on public.checklists;
create policy checklists_select on public.checklists
  for select to authenticated
  using (public.can_read_task(task_id));

-- Semua anggota kelas boleh mencentang progres checklist
drop policy if exists checklists_member_update on public.checklists;
create policy checklists_member_update on public.checklists
  for update to authenticated
  using (public.can_read_task(task_id)) with check (public.can_read_task(task_id));

drop policy if exists checklists_admin_write on public.checklists;
create policy checklists_admin_write on public.checklists
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- groups ----------
drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups
  for select to authenticated
  using (public.is_admin() or public.is_class_member(class_id));

drop policy if exists groups_admin_write on public.groups;
create policy groups_admin_write on public.groups
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- group_members ----------
drop policy if exists group_members_select on public.group_members;
create policy group_members_select on public.group_members
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.groups g
      where g.id = group_id and public.is_class_member(g.class_id)
    )
  );

drop policy if exists group_members_admin_write on public.group_members;
create policy group_members_admin_write on public.group_members
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- attachments ----------
drop policy if exists attachments_select on public.attachments;
create policy attachments_select on public.attachments
  for select to authenticated
  using (public.can_read_task(task_id));

drop policy if exists attachments_admin_write on public.attachments;
create policy attachments_admin_write on public.attachments
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- submissions ----------
drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Insert: mahasiswa, untuk dirinya sendiri, tugas terbuka, dalam window waktu
drop policy if exists submissions_insert_own on public.submissions;
create policy submissions_insert_own on public.submissions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.my_role() = 'mahasiswa'
    and public.task_submission_open(task_id)
  );

-- Update: pemilik, belum dinilai, tugas masih menerima revisi
-- Kolom sensitif (status, feedback, graded_at) dilindungi COLUMN PRIVILEGES di bawah
drop policy if exists submissions_update_own on public.submissions;
create policy submissions_update_own on public.submissions
  for update to authenticated
  using (user_id = auth.uid() and status <> 'graded')
  with check (
    user_id = auth.uid()
    and status in ('submitted', 'revised')
    and public.task_submission_open(task_id)
  );

-- Delete: pemilik, selama belum dinilai
drop policy if exists submissions_delete_own on public.submissions;
create policy submissions_delete_own on public.submissions
  for delete to authenticated
  using (user_id = auth.uid() and status <> 'graded');

-- ======== COLUMN PRIVILEGES submissions (defense in depth) ====
-- Mahasiswa FISIK tidak dapat menyentuh status / feedback / graded_at.
revoke all privileges on public.submissions from authenticated;
grant select on public.submissions to authenticated;
-- user_id boleh di-set saat INSERT karena WITH CHECK RLS memaksa user_id = auth.uid()
grant insert (task_id, user_id, content, file_url, storage_path) on public.submissions to authenticated;
grant update (content, file_url, storage_path) on public.submissions to authenticated;
grant delete on public.submissions to authenticated;

-- ---------- announcements ----------
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements
  for select to authenticated
  using (public.is_admin() or public.is_class_member(class_id));

drop policy if exists announcements_admin_write on public.announcements;
create policy announcements_admin_write on public.announcements
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- notifications ----------
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

-- Hanya bisa menandai miliknya sebagai dibaca (kolom `read` saja via GRANT)
drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke update on public.notifications from authenticated;
grant update (read) on public.notifications to authenticated;
revoke insert, delete on public.notifications from authenticated;

-- ================= STORAGE BUCKETS ===========================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('attachments', 'attachments', false, 52428800, null),
  ('submissions', 'submissions', false, 52428800, null)
on conflict (id) do nothing;

-- ---- attachments: semua anggota kelas baca; admin tulis ----
drop policy if exists "attachments read members" on storage.objects;
create policy "attachments read members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'attachments'
    and exists (select 1 from public.class_members cm where cm.user_id = auth.uid())
  );

drop policy if exists "attachments admin write" on storage.objects;
create policy "attachments admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'attachments' and public.is_admin())
  with check (bucket_id = 'attachments' and public.is_admin());

-- ---- submissions: folder = user_id; pemilik & admin saja ----
drop policy if exists "submissions read own folder" on storage.objects;
create policy "submissions read own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'submissions'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists "submissions insert own folder" on storage.objects;
create policy "submissions insert own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.my_role() = 'mahasiswa'
  );

drop policy if exists "submissions update own folder" on storage.objects;
create policy "submissions update own folder" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "submissions delete own folder" on storage.objects;
create policy "submissions delete own folder" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'submissions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ================= REALTIME (notifications) ==================
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
