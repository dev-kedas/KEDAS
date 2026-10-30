-- =====================================================================
-- KEDAS - skema Supabase (jalankan di Dashboard > SQL Editor)
-- Belum dites di project lu, jalankan, lalu cek error kalau ada.
-- =====================================================================

-- ---------- TABEL ----------------------------------------------------

create table public.classes (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  code       text not null unique
             default ('KAS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  -- className, mode, nominal, startDate, openingBalance, reminderDays,
  -- targetName, targetAmount, theme  (sama persis kayak S.settings, tanpa adminPin/classCode)
  settings   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.students (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  name       text not null check (length(trim(name)) > 0),
  created_at timestamptz not null default now(),
  unique (id, class_id)            -- dipakai FK komposit di payments
);

create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null,
  amount     bigint not null check (amount > 0),
  paid_on    date not null,
  note       text not null default '',
  created_at timestamptz not null default now(),
  -- pastikan anggota memang anggota kelas yang sama
  foreign key (student_id, class_id) references public.students(id, class_id) on delete cascade
);

create table public.expenses (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  name       text not null,
  spent_on   date not null,
  amount     bigint not null check (amount > 0),
  category   text not null default '',
  note       text not null default '',
  created_at timestamptz not null default now()
);

-- anggota yang "masuk" ke kelas (login anonim -> dihubungkan ke 1 baris students)
create table public.class_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,  -- 1 akun = 1 kelas
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null,
  created_at timestamptz not null default now(),
  foreign key (student_id, class_id) references public.students(id, class_id) on delete cascade
);

-- pengganti S.readNotifs (per pengguna)
create table public.notif_reads (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  notif_id text not null,
  primary key (user_id, notif_id)
);

create index on public.students (class_id);
create index on public.payments (class_id, student_id);
create index on public.expenses (class_id);
create index on public.class_members (class_id);

-- ---------- FUNGSI BANTU (dipakai RLS) -------------------------------

create or replace function public.is_class_owner(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.classes where id = cid and owner_id = auth.uid());
$$;

create or replace function public.is_class_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.class_members where class_id = cid and user_id = auth.uid());
$$;

-- ---------- RLS ------------------------------------------------------

alter table public.classes       enable row level security;
alter table public.students      enable row level security;
alter table public.payments      enable row level security;
alter table public.expenses      enable row level security;
alter table public.class_members enable row level security;
alter table public.notif_reads   enable row level security;

-- classes
create policy classes_select on public.classes for select to authenticated
  using (owner_id = auth.uid() or public.is_class_member(id));
create policy classes_insert on public.classes for insert to authenticated
  with check (owner_id = auth.uid() and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false));
create policy classes_update on public.classes for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy classes_delete on public.classes for delete to authenticated
  using (owner_id = auth.uid());

-- students / payments / expenses: semua anggota boleh baca, hanya admin (owner) boleh tulis
create policy students_select on public.students for select to authenticated
  using (public.is_class_owner(class_id) or public.is_class_member(class_id));
create policy students_write on public.students for all to authenticated
  using (public.is_class_owner(class_id)) with check (public.is_class_owner(class_id));

create policy payments_select on public.payments for select to authenticated
  using (public.is_class_owner(class_id) or public.is_class_member(class_id));
create policy payments_write on public.payments for all to authenticated
  using (public.is_class_owner(class_id)) with check (public.is_class_owner(class_id));

create policy expenses_select on public.expenses for select to authenticated
  using (public.is_class_owner(class_id) or public.is_class_member(class_id));
create policy expenses_write on public.expenses for all to authenticated
  using (public.is_class_owner(class_id)) with check (public.is_class_owner(class_id));

-- class_members: lihat baris sendiri atau (admin) semua di kelasnya; insert hanya lewat join_class()
create policy members_select on public.class_members for select to authenticated
  using (user_id = auth.uid() or public.is_class_owner(class_id));
create policy members_delete on public.class_members for delete to authenticated
  using (public.is_class_owner(class_id));

-- notif_reads: milik sendiri
create policy notif_reads_all on public.notif_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- RPC UNTUK anggota (belum jadi anggota, jadi tidak lolos RLS) ----

-- 1) cek kode kelas -> nama kelas + daftar anggota (untuk dropdown pilih nama)
create or replace function public.preview_class(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id,
    'name', c.settings ->> 'className',
    'students', coalesce(
      (select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name) order by s.name)
         from public.students s where s.class_id = c.id),
      '[]'::jsonb)
  )
  from public.classes c
  where c.code = upper(trim(p_code));
$$;

-- 2) gabung ke kelas sebagai anggota tertentu
create or replace function public.join_class(p_code text, p_student uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Harus login dulu'; end if;
  select id into cid from public.classes where code = upper(trim(p_code));
  if cid is null then raise exception 'Kode kelas tidak ditemukan'; end if;
  if not exists (select 1 from public.students where id = p_student and class_id = cid) then
    raise exception 'anggota tidak ada di kelas ini';
  end if;
  insert into public.class_members (user_id, class_id, student_id)
  values (auth.uid(), cid, p_student)
  on conflict (user_id) do update
    set class_id = excluded.class_id, student_id = excluded.student_id;
  return cid;
end $$;

revoke execute on function public.preview_class(text)       from public, anon;
revoke execute on function public.join_class(text, uuid)    from public, anon;
grant  execute on function public.preview_class(text)       to authenticated;
grant  execute on function public.join_class(text, uuid)    to authenticated;

-- ---------- REALTIME (menggantikan event 'storage' antar tab) --------

alter publication supabase_realtime add table public.students, public.payments, public.expenses, public.classes;
