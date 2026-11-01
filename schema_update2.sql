-- =====================================================================
-- KEDAS - update skema #2: notifikasi HP (push) + riwayat pengumuman
-- Jalankan SETELAH schema.sql dan schema_update.sql, cukup sekali.
-- Dashboard Supabase > SQL Editor > New query > paste semua > Run
-- =====================================================================

-- ---------- 1. Langganan push (1 baris = 1 browser/HP) ----------------
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  class_id   uuid not null references public.classes(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_class on public.push_subscriptions (class_id);
create index if not exists push_subscriptions_user  on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

-- baca: baris sendiri, atau (admin) semua di organisasinya (untuk menghitung jangkauan)
drop policy if exists push_select on public.push_subscriptions;
create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid() or public.is_class_owner(class_id));
-- tulis/hapus hanya lewat RPC di bawah

-- Simpan langganan milik pengguna yang sedang login (admin atau siswa anggota).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_ua text default '')
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Harus masuk dulu'; end if;
  select id into cid from public.classes where owner_id = auth.uid() limit 1;
  if cid is null then select class_id into cid from public.class_members where user_id = auth.uid(); end if;
  if cid is null then raise exception 'Kamu belum tergabung di organisasi mana pun'; end if;
  insert into public.push_subscriptions (endpoint, user_id, class_id, p256dh, auth, user_agent)
  values (p_endpoint, auth.uid(), cid, p_p256dh, p_auth, left(coalesce(p_ua, ''), 300))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, class_id = excluded.class_id,
        p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent;
end $$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke execute on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke execute on function public.remove_push_subscription(text)                 from public, anon;
grant  execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant  execute on function public.remove_push_subscription(text)                 to authenticated;

-- ---------- 2. Pengumuman dari admin (muncul juga di lonceng aplikasi) ----
-- student_ids null = semua siswa; berisi = hanya siswa tersebut.
create table if not exists public.broadcasts (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  title       text not null check (length(trim(title)) between 1 and 80),
  body        text not null default '' check (length(body) <= 300),
  student_ids uuid[],
  created_at  timestamptz not null default now()
);
create index if not exists broadcasts_class on public.broadcasts (class_id, created_at desc);
alter table public.broadcasts enable row level security;

drop policy if exists broadcasts_select on public.broadcasts;
create policy broadcasts_select on public.broadcasts for select to authenticated
  using (
    public.is_class_owner(class_id)
    or exists (
      select 1 from public.class_members m
      where m.user_id = auth.uid() and m.class_id = broadcasts.class_id
        and (broadcasts.student_ids is null or m.student_id = any (broadcasts.student_ids))
    )
  );
-- insert dilakukan oleh Edge Function send-push (service role) setelah cek admin.
drop policy if exists broadcasts_delete on public.broadcasts;
create policy broadcasts_delete on public.broadcasts for delete to authenticated
  using (public.is_class_owner(class_id));

-- realtime supaya lonceng siswa langsung bertambah
do $$ begin
  alter publication supabase_realtime add table public.broadcasts;
exception when duplicate_object then null; end $$;
