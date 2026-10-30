-- =====================================================================
-- KEDAS - update skema (jalankan SETELAH schema.sql, cukup sekali)
-- Dashboard Supabase > SQL Editor > New query > paste semua > Run
-- Belum dites langsung di project lu. Kalau ada error, kirim teksnya.
-- =====================================================================

-- ---------- 1. Foto bukti pengeluaran -------------------------------
-- Foto disimpan di tabel terpisah supaya daftar pengeluaran tetap ringan.

alter table public.expenses add column if not exists has_photo boolean not null default false;
alter table public.expenses add constraint expenses_id_class_unique unique (id, class_id);

create table public.expense_photos (
  expense_id uuid primary key,
  class_id   uuid not null references public.classes(id) on delete cascade,
  photo      text not null check (length(photo) < 600000),   -- batas ~600 KB per foto
  foreign key (expense_id, class_id) references public.expenses(id, class_id) on delete cascade
);
alter table public.expense_photos enable row level security;

create policy photos_select on public.expense_photos for select to authenticated
  using (public.is_class_owner(class_id) or public.is_class_member(class_id));
create policy photos_write on public.expense_photos for all to authenticated
  using (public.is_class_owner(class_id)) with check (public.is_class_owner(class_id));

-- ---------- 2. Satu akun admin = satu organisasi ---------------------

create unique index if not exists classes_owner_unique on public.classes (owner_id);

-- kode organisasi unik tanpa peduli huruf besar/kecil dan tanda hubung
create unique index if not exists classes_code_norm on public.classes (upper(replace(code, '-', '')));

-- ---------- 3. Cek kode & gabung (toleran format kode) ---------------

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
  where upper(replace(c.code, '-', '')) = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
$$;

create or replace function public.join_class(p_code text, p_student uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Harus masuk dulu'; end if;
  select id into cid from public.classes
   where upper(replace(code, '-', '')) = upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g'));
  if cid is null then raise exception 'Kode organisasi tidak ditemukan'; end if;
  if not exists (select 1 from public.students where id = p_student and class_id = cid) then
    raise exception 'anggota tidak ada di organisasi ini';
  end if;
  insert into public.class_members (user_id, class_id, student_id)
  values (auth.uid(), cid, p_student)
  on conflict (user_id) do update
    set class_id = excluded.class_id, student_id = excluded.student_id;
  return cid;
end $$;

-- preview boleh dipanggil sebelum anggota punya sesi (supaya tidak membuat akun anonim untuk kode yang salah)
revoke execute on function public.preview_class(text)    from public;
revoke execute on function public.join_class(text, uuid) from public, anon;
grant  execute on function public.preview_class(text)    to anon, authenticated;
grant  execute on function public.join_class(text, uuid) to authenticated;

-- ---------- 4. Ganti seluruh data sekaligus (Muat Excel / kosongkan / contoh)
-- security invoker = tetap tunduk RLS; hanya admin organisasi yang lolos.

create or replace function public.replace_class_data(
  p_class uuid, p_students jsonb, p_payments jsonb, p_expenses jsonb)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_class_owner(p_class) then
    raise exception 'Kamu bukan admin organisasi ini';
  end if;

  delete from public.payments where class_id = p_class;
  delete from public.expenses where class_id = p_class;   -- foto ikut terhapus (cascade)
  delete from public.students where class_id = p_class;

  insert into public.students (id, class_id, name)
  select (x ->> 'id')::uuid, p_class, x ->> 'name'
  from jsonb_array_elements(coalesce(p_students, '[]'::jsonb)) x;

  insert into public.payments (class_id, student_id, amount, paid_on, note, created_at)
  select p_class, (x ->> 'student_id')::uuid, (x ->> 'amount')::bigint, (x ->> 'date')::date,
         coalesce(x ->> 'note', ''),
         to_timestamp(coalesce((x ->> 'ts')::double precision, extract(epoch from now()) * 1000) / 1000.0)
  from jsonb_array_elements(coalesce(p_payments, '[]'::jsonb)) x;

  insert into public.expenses (class_id, name, spent_on, amount, category, note, created_at)
  select p_class, x ->> 'name', (x ->> 'date')::date, (x ->> 'amount')::bigint,
         coalesce(x ->> 'category', ''), coalesce(x ->> 'note', ''),
         to_timestamp(coalesce((x ->> 'ts')::double precision, extract(epoch from now()) * 1000) / 1000.0)
  from jsonb_array_elements(coalesce(p_expenses, '[]'::jsonb)) x;
end $$;

revoke execute on function public.replace_class_data(uuid, jsonb, jsonb, jsonb) from public, anon;
grant  execute on function public.replace_class_data(uuid, jsonb, jsonb, jsonb) to authenticated;
