-- Kabar dari KEDAS (tab "KEDAS" di notifikasi). Dikirim lewat edge function send-kedas-update.
create table if not exists public.kedas_updates (
  id         text primary key check (id ~ '^[A-Za-z0-9_-]{3,40}$'),
  tag        text not null default 'baru' check (tag in ('baru', 'perbaikan', 'info')),
  title      text not null check (length(trim(title)) between 1 and 80),
  items      text[] not null default '{}' check (cardinality(items) <= 10),
  created_at timestamptz not null default now()
);
create index if not exists kedas_updates_created on public.kedas_updates (created_at desc);
alter table public.kedas_updates enable row level security;

-- Semua pengguna yang sudah masuk (admin dan anggota) boleh baca.
-- Tidak ada policy insert/update/delete: hanya service role (edge function) yang bisa menulis.
drop policy if exists kedas_updates_select on public.kedas_updates;
create policy kedas_updates_select on public.kedas_updates for select to authenticated using (true);

do $$ begin
  alter publication supabase_realtime add table public.kedas_updates;
exception when duplicate_object then null; end $$;
