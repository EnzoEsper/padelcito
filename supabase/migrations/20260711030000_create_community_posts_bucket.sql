-- Public post cover images bucket. Path convention: {author_id}/{filename}

insert into storage.buckets (id, name, public)
values ('community-posts', 'community-posts', true)
on conflict (id) do nothing;

create policy "Post cover images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'community-posts');

create policy "Users upload post covers to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'community-posts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users update their own post cover images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'community-posts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users delete their own post cover images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'community-posts'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
