-- Public flyer images bucket. Path convention: {author_id}/{filename}

insert into storage.buckets (id, name, public)
values ('flyers', 'flyers', true)
on conflict (id) do nothing;

create policy "Flyer images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'flyers');

create policy "Users upload flyers to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flyers'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users update their own flyer images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'flyers'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users delete their own flyer images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flyers'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
