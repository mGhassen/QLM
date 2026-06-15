alter table public.organizations
  add column if not exists hide_sidebar boolean not null default false;

comment on column public.organizations.hide_sidebar is
  'When true, the project shell left sidebar is hidden for all members of this organization.';
