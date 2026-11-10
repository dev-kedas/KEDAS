-- =====================================================================
-- KEDAS - update skema #3: foto pratinjau untuk link bagikan
-- Jalankan SETELAH schema.sql, schema_update.sql, dan schema_update2.sql, cukup sekali.
-- Dashboard Supabase > SQL Editor > New query > paste semua > Run
-- =====================================================================

-- Bucket publik: crawler WhatsApp/Telegram harus bisa mengambil gambarnya tanpa login.
-- Hanya JPEG, maks 512 KB (aplikasi sudah mengecilkan foto jadi ~1200x630).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('share-photos', 'share-photos', true, 524288, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 524288, allowed_mime_types = array['image/jpeg'];

-- Struktur file: <id organisasi>/<token>.jpg. Hanya admin pemilik organisasi yang boleh
-- mengunggah / melihat daftar / menghapus di folder organisasinya. Baca publik lewat URL bucket.
drop policy if exists share_photos_insert on storage.objects;
create policy share_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'share-photos'
    and public.is_class_owner(((storage.foldername(name))[1])::uuid));

drop policy if exists share_photos_select on storage.objects;
create policy share_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'share-photos'
    and public.is_class_owner(((storage.foldername(name))[1])::uuid));

drop policy if exists share_photos_delete on storage.objects;
create policy share_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'share-photos'
    and public.is_class_owner(((storage.foldername(name))[1])::uuid));

-- Cek (harus: bucket 1, policies 3):
select (select count(*) from storage.buckets where id = 'share-photos') as bucket,
       (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'share_photos_%') as policies;
