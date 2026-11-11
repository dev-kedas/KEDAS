
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('share-photos', 'share-photos', true, 524288, array['image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 524288, allowed_mime_types = array['image/jpeg'];

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

select (select count(*) from storage.buckets where id = 'share-photos') as bucket,
       (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'share_photos_%') as policies;
