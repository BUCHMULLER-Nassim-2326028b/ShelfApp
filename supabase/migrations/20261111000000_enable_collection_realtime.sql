-- Broadcast collection changes to every signed-in device.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'collection_items'
  ) then
    alter publication supabase_realtime add table public.collection_items;
  end if;
end
$$;
