-- Docs CMS: strategic research documents with layout JSON + markdown sections in storage

create table if not exists public.doc_documents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  locale text not null default 'fr',
  published boolean not null default false,
  storage_prefix text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  author_id uuid references auth.users(id) on delete set null
);

alter table public.doc_documents enable row level security;

create policy "Authenticated users can read all docs"
  on public.doc_documents for select
  to authenticated
  using (true);

create policy "Authenticated users can insert docs"
  on public.doc_documents for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update docs"
  on public.doc_documents for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete docs"
  on public.doc_documents for delete
  to authenticated
  using (true);

create index if not exists idx_doc_documents_slug on public.doc_documents (slug);

create or replace function public.touch_doc_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger doc_documents_touch_updated_at
  before update on public.doc_documents
  for each row
  execute function public.touch_doc_documents_updated_at();

insert into storage.buckets (id, name, public)
values ('docs', 'docs', false)
on conflict (id) do nothing;

create policy "Authenticated users can read doc files"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'docs');

create policy "Authenticated users can upload doc files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'docs');

create policy "Authenticated users can update doc files"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'docs')
  with check (bucket_id = 'docs');

create policy "Authenticated users can delete doc files"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'docs');
