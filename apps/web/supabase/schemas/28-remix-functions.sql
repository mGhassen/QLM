/*
 * -------------------------------------------------------
 * Section: Remix Functions
 * Functions to remix (copy) public content to user's organization.
 * -------------------------------------------------------
 */

-- Helper function to generate short IDs (similar to TypeScript shortenId)
-- This generates a 10-character alphanumeric string from a UUID
-- Note: This is a simplified version. For exact matching with TypeScript,
-- consider using a PostgreSQL extension or calling an API endpoint.
create or replace function public.shorten_id(input_id uuid)
returns text
language plpgsql
immutable
as $$
declare
  hash_value bigint;
  alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
  char_index integer;
  temp_hash bigint;
begin
  -- Convert UUID to hash using multiple hash functions for better distribution
  hash_value := abs(hashtext(input_id::text));
  temp_hash := hash_value;
  
  -- Generate 10-character string
  for i in 1..10 loop
    char_index := (abs(temp_hash) % 62) + 1;
    result := result || substr(alphabet, char_index, 1);
    -- Rotate hash for next character
    temp_hash := (temp_hash * 33 + i)::bigint;
  end loop;
  
  return result;
end;
$$;

-- Function to remix a public notebook
create or replace function public.remix_notebook(
  source_notebook_id uuid,
  target_project_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_notebook_id uuid;
  source_notebook public.notebooks;
begin
  -- Verify source notebook is public
  select * into source_notebook
  from public.notebooks
  where id = source_notebook_id and is_public = true;
  
  if not found then
    raise exception 'Notebook not found or not public';
  end if;
  
  -- Verify user has access to target project
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.has_role_on_organization(p.organization_id)
  ) then
    raise exception 'Access denied to target project';
  end if;
  
  -- Create new notebook as copy
  insert into public.notebooks (
    project_id, slug, title, description, datasources, cells, version,
    created_by, remixed_from, is_public
  )
  values (
    target_project_id,
    -- Generate new slug
    public.shorten_id(extensions.uuid_generate_v4()),
    source_notebook.title || ' (Remix)',
    source_notebook.description,
    source_notebook.datasources, -- Will need to remix referenced datasources
    source_notebook.cells,
    1, -- Reset version
    auth.uid(),
    source_notebook_id,
    false -- Remixed notebooks are private by default
  )
  returning id into new_notebook_id;
  
  return new_notebook_id;
end;
$$;

-- Function to remix a public conversation
create or replace function public.remix_conversation(
  source_conversation_id uuid,
  target_project_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_conversation_id uuid;
  source_conversation public.conversations;
begin
  -- Verify source conversation is public
  select * into source_conversation
  from public.conversations
  where id = source_conversation_id and is_public = true;
  
  if not found then
    raise exception 'Conversation not found or not public';
  end if;
  
  -- Verify user has access to target project
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.has_role_on_organization(p.organization_id)
  ) then
    raise exception 'Access denied to target project';
  end if;
  
  -- Create new conversation as copy
  insert into public.conversations (
    project_id, slug, title, task_id, datasources,
    created_by, remixed_from, is_public
  )
  values (
    target_project_id,
    public.shorten_id(extensions.uuid_generate_v4()),
    source_conversation.title || ' (Remix)',
    source_conversation.task_id,
    source_conversation.datasources, -- Will need to remix referenced datasources
    auth.uid(),
    source_conversation_id,
    false -- Remixed conversations are private by default
  )
  returning id into new_conversation_id;
  
  -- Note: Messages are not copied - remixed conversations start fresh
  -- If needed, messages can be copied separately
  
  return new_conversation_id;
end;
$$;

-- Function to remix a public datasource
create or replace function public.remix_datasource(
  source_datasource_id uuid,
  target_project_id uuid
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_datasource_id uuid;
  source_datasource public.datasources;
begin
  -- Verify source datasource is public
  select * into source_datasource
  from public.datasources
  where id = source_datasource_id and is_public = true;
  
  if not found then
    raise exception 'Datasource not found or not public';
  end if;
  
  -- Verify user has access to target project
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.has_role_on_organization(p.organization_id)
  ) then
    raise exception 'Access denied to target project';
  end if;
  
  -- Create new datasource as copy (without credentials - user must configure)
  insert into public.datasources (
    project_id, slug, name, description,
    datasource_provider, datasource_driver, datasource_kind,
    datasource_config, is_private, is_public, created_by, remixed_from
  )
  values (
    target_project_id,
    public.shorten_id(extensions.uuid_generate_v4()),
    source_datasource.name || ' (Remix)',
    source_datasource.description,
    source_datasource.datasource_provider,
    source_datasource.datasource_driver,
    source_datasource.datasource_kind,
    '{}'::jsonb, -- Empty config - user must configure credentials
    true, -- Remixed datasources are private by default
    false,
    auth.uid(),
    source_datasource_id
  )
  returning id into new_datasource_id;
  
  return new_datasource_id;
end;
$$;

-- Grant execute permissions
grant execute on function public.shorten_id(uuid) to authenticated, anon;
grant execute on function public.remix_notebook(uuid, uuid) to authenticated;
grant execute on function public.remix_conversation(uuid, uuid) to authenticated;
grant execute on function public.remix_datasource(uuid, uuid) to authenticated;

