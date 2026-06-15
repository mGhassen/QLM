-- Seed the roles table with default roles
insert into public.roles(name, hierarchy_level)
values ('owner', 1);
insert into public.roles(name, hierarchy_level)
values ('administrator', 2);
insert into public.roles(name, hierarchy_level)
values ('analyst', 3);
insert into public.roles(name, hierarchy_level)
values ('viewer', 4);
-- We seed the role_permissions table with the default roles and permissions
-- Owner permissions
insert into public.role_permissions(role, permission)
values ('owner', 'roles.manage'),
  ('owner', 'billing.manage'),
  ('owner', 'settings.manage'),
  ('owner', 'members.manage'),
  ('owner', 'invites.manage'),
  ('owner', 'projects.manage'),
  ('owner', 'datasources.manage'),
  ('owner', 'datasources.publish'),
  ('owner', 'notebooks.manage'),
  ('owner', 'notebooks.share'),
  ('owner', 'notebooks.publish'),
  ('owner', 'conversations.manage'),
  ('owner', 'conversations.share'),
  ('owner', 'conversations.publish'),
  ('owner', 'messages.manage'),
  ('owner', 'usage.view');
-- Administrator permissions
insert into public.role_permissions(role, permission)
values ('administrator', 'billing.manage'),
  ('administrator', 'settings.manage'),
  ('administrator', 'members.manage'),
  ('administrator', 'invites.manage'),
  ('administrator', 'projects.manage'),
  ('administrator', 'datasources.manage'),
  ('administrator', 'datasources.publish'),
  ('administrator', 'notebooks.manage'),
  ('administrator', 'notebooks.share'),
  ('administrator', 'notebooks.publish'),
  ('administrator', 'conversations.manage'),
  ('administrator', 'conversations.share'),
  ('administrator', 'conversations.publish'),
  ('administrator', 'messages.manage'),
  ('administrator', 'usage.view');
-- Analyst permissions
insert into public.role_permissions(role, permission)
values ('analyst', 'notebooks.manage'),
  ('analyst', 'notebooks.share'),
  ('analyst', 'notebooks.publish'),
  ('analyst', 'conversations.manage'),
  ('analyst', 'conversations.share'),
  ('analyst', 'conversations.publish'),
  ('analyst', 'messages.manage'),
  ('analyst', 'datasources.manage'),
  ('analyst', 'datasources.publish');
-- Viewer permissions (none - read-only via RLS policies)