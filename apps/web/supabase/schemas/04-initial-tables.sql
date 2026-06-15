
/*
 * -------------------------------------------------------
 * Section: Organizations
 * Organizations represent team accounts and are the top-level entity for grouping projects.
 * They replace team accounts (accounts where is_personal_account = false).
 * -------------------------------------------------------
 */

-- Organizations table
create table if not exists public.organizations (
  id uuid unique not null default extensions.uuid_generate_v4(),
  slug text not null,
  name varchar(255) not null,
  email varchar(320),
  picture_url varchar(1000),
  user_id uuid references auth.users on delete cascade not null default auth.uid(),
  credits_balance integer not null default 0,
  credits_total_purchased integer not null default 0,
  credits_total_consumed integer not null default 0,
  credits_total_allocated integer not null default 0,
  public_data jsonb default '{}'::jsonb not null,
  hide_sidebar boolean not null default false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id)
);

comment on table public.organizations is 'Organizations represent team accounts and are the top-level entity for grouping projects.';

comment on column public.organizations.slug is 'The slug of the organization';
comment on column public.organizations.name is 'The name of the organization';
comment on column public.organizations.email is 'The email of the organization';
comment on column public.organizations.picture_url is 'The picture URL of the organization';
comment on column public.organizations.user_id is 'The primary owner of the organization';
comment on column public.organizations.credits_balance is 'Current available credits balance';
comment on column public.organizations.credits_total_purchased is 'Total credits purchased (cumulative)';
comment on column public.organizations.credits_total_consumed is 'Total credits consumed (cumulative)';
comment on column public.organizations.credits_total_allocated is 'Total credits allocated to projects/users (cumulative)';
comment on column public.organizations.hide_sidebar is 'When true, the project shell left sidebar is hidden for all members of this organization.';

-- Enable RLS on the organizations table
alter table "public"."organizations" enable row level security;

-- Revoke default permissions
revoke all on public.organizations from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.organizations to authenticated;

-- Indexes
create index if not exists ix_organizations_slug on public.organizations (slug);
create unique index if not exists unique_organizations_slug on public.organizations (slug);
create index if not exists ix_organizations_user_id on public.organizations (user_id);

/*
 * -------------------------------------------------------
 * Section: Accounts
 * Accounts are relative to users and contains identification information for the user.
 * -------------------------------------------------------
 */

-- Accounts table
create table if not exists
  public.accounts (
    id uuid unique not null default extensions.uuid_generate_v4 (),
    user_id uuid unique not null references auth.users on delete cascade not null default auth.uid (),
    name varchar(255) not null,
    email varchar(320) unique,
    updated_at timestamp with time zone,
    created_at timestamp with time zone,
    created_by uuid references auth.users,
    updated_by uuid references auth.users,
    picture_url varchar(1000),
    public_data jsonb default '{}'::jsonb not null,
    primary key (id)
  );

comment on table public.accounts is 'Accounts are personal accounts only (one per user). Team accounts have been replaced by organizations.';

comment on column public.accounts.name is 'The name of the account';

comment on column public.accounts.user_id is 'The user ID of the account';

comment on column public.accounts.email is 'The email of the account';

-- Enable RLS on the accounts table
alter table "public"."accounts" enable row level security;

-- Revoke all on accounts table from authenticated and service_role
revoke all on public.accounts
from
  authenticated,
  service_role;

-- Open up access to accounts
grant
select
,
  insert,
update,
delete on table public.accounts to authenticated,
service_role;

-- Indexes
create index if not exists ix_accounts_user_id on public.accounts (user_id);

/*
 * -------------------------------------------------------
 * Section: Memberships
 * We create the schema for the memberships. Memberships are the memberships for an organization. For example, a user might be a member of an organization with the role 'owner'.
 * -------------------------------------------------------
 */
-- Organization Memberships table
create table if not exists public.organization_memberships (
  user_id uuid references auth.users on delete cascade not null,
  organization_id uuid references public.organizations (id) on delete cascade not null,
  account_role varchar(50) references public.roles (name) not null,
  created_at timestamptz default current_timestamp not null,
  updated_at timestamptz default current_timestamp not null,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (user_id, organization_id)
);
comment on table public.organization_memberships is 'The memberships for an organization';
comment on column public.organization_memberships.organization_id is 'The organization the membership is for';
comment on column public.organization_memberships.account_role is 'The role for the membership';
-- Revoke all on organization_memberships table from authenticated and service_role
revoke all on public.organization_memberships
from authenticated,
  service_role;
-- Open up access to organization_memberships table for authenticated users and service_role
grant select,
  insert,
  update,
  delete on table public.organization_memberships to authenticated,
  service_role;
-- Indexes on the organization_memberships table
create index ix_organization_memberships_organization_id on public.organization_memberships (organization_id);
create index ix_organization_memberships_user_id on public.organization_memberships (user_id);
create index ix_organization_memberships_account_role on public.organization_memberships (account_role);
-- Enable RLS on the organization_memberships table
alter table public.organization_memberships enable row level security;


/*
 * -------------------------------------------------------
 * Section: Role Permissions
 * We create the schema for the role permissions. Role permissions are the permissions for a role.
 * For example, the 'owner' role might have the 'roles.manage' permission.
 * -------------------------------------------------------
 
 */
-- Create table for roles permissions
create table if not exists
  public.role_permissions (
    id bigint generated by default as identity primary key,
    role varchar(50) references public.roles (name) not null,
    permission public.app_permissions not null,
    unique (role, permission)
  );

comment on table public.role_permissions is 'The permissions for a role';

comment on column public.role_permissions.role is 'The role the permission is for';

comment on column public.role_permissions.permission is 'The permission for the role';

-- Indexes on the role_permissions table
create index ix_role_permissions_role on public.role_permissions (role);

-- Revoke all on role_permissions table from authenticated and service_role
revoke all on public.role_permissions
from
  authenticated,
  service_role;

-- Open up access to role_permissions table for authenticated users and service_role
grant
select
,
  insert,
update,
delete on table public.role_permissions to service_role;

/*
 * -------------------------------------------------------
 * Section: Projects
 * Projects belong to organizations and contain datasources, notebooks, and conversations.
 * -------------------------------------------------------
 */

-- Projects table
create table if not exists public.projects (
  id uuid unique not null default extensions.uuid_generate_v4(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  slug text not null,
  name varchar(255) not null,
  description text,
  status text default 'active',
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id)
);

comment on table public.projects is 'Projects belong to organizations and contain datasources, notebooks, and conversations.';

comment on column public.projects.organization_id is 'The organization this project belongs to';
comment on column public.projects.slug is 'The slug of the project';
comment on column public.projects.name is 'The name of the project';
comment on column public.projects.description is 'The description of the project';
comment on column public.projects.status is 'The status of the project (e.g., active, archived)';

-- Enable RLS on the projects table
alter table "public"."projects" enable row level security;

-- Revoke default permissions
revoke all on public.projects from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.projects to authenticated;

-- Indexes
create index if not exists ix_projects_organization_id on public.projects (organization_id);
create index if not exists ix_projects_slug on public.projects (slug);
create unique index if not exists unique_projects_slug_per_organization on public.projects (organization_id, slug);

/*
 * -------------------------------------------------------
 * Section: Datasources
 * Datasources belong to projects and define data connections.
 * -------------------------------------------------------
 */

-- Datasources table
create table if not exists public.datasources (
  id uuid unique not null default extensions.uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  slug text not null,
  name varchar(255) not null,
  description text not null,
  datasource_provider text not null,
  datasource_driver text not null,
  datasource_kind text not null,
  datasource_config jsonb not null default '{}'::jsonb,
  is_private boolean default false not null,
  is_public boolean default false not null,
  remixed_from uuid references public.datasources(id) on delete set null,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id)
);

comment on table public.datasources is 'Datasources belong to projects and define data connections.';

comment on column public.datasources.project_id is 'The project this datasource belongs to';
comment on column public.datasources.slug is 'The slug of the datasource';
comment on column public.datasources.name is 'The name of the datasource';
comment on column public.datasources.description is 'The description of the datasource';
comment on column public.datasources.datasource_provider is 'The provider of the datasource';
comment on column public.datasources.datasource_driver is 'The driver used for the datasource';
comment on column public.datasources.datasource_kind is 'The kind of datasource';
comment on column public.datasources.datasource_config is 'The configuration for the datasource (JSON)';
comment on column public.datasources.is_private is 'If true, this datasource is only visible to its creator. Private datasources can be created by Analysts.';
comment on column public.datasources.is_public is 'If true, this datasource is publicly viewable by anyone. Can be remixed by any user.';
comment on column public.datasources.remixed_from is 'If set, this datasource was remixed (copied) from another datasource. Points to the original.';

-- Constraint: cannot be both private and public
alter table public.datasources
add constraint datasources_private_public_exclusive 
  check (not (is_private = true and is_public = true));

-- Enable RLS on the datasources table
alter table "public"."datasources" enable row level security;

-- Revoke default permissions
revoke all on public.datasources from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.datasources to authenticated;

-- Indexes
create index if not exists ix_datasources_project_id on public.datasources (project_id);
create index if not exists ix_datasources_slug on public.datasources (slug);
create unique index if not exists unique_datasources_slug_per_project on public.datasources (project_id, slug);


/*
 * -------------------------------------------------------
 * Section: Conversations
 * Conversations belong to projects and contain messages.
 * -------------------------------------------------------
 */

-- Conversations table
create table if not exists public.conversations (
  id uuid unique not null default extensions.uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  slug text not null,
  title varchar(255) not null,
  task_id text not null,
  datasources jsonb not null default '[]'::jsonb,
  is_public boolean default false not null,
  remixed_from uuid references public.conversations(id) on delete set null,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id)
);

comment on table public.conversations is 'Conversations belong to projects and contain messages.';

comment on column public.conversations.project_id is 'The project this conversation belongs to';
comment on column public.conversations.slug is 'The slug of the conversation';
comment on column public.conversations.title is 'The title of the conversation';
comment on column public.conversations.task_id is 'The task ID associated with this conversation';
comment on column public.conversations.datasources is 'Array of datasource IDs (JSON)';
comment on column public.conversations.is_public is 'If true, this conversation is publicly viewable by anyone. Can be remixed by any user. Private conversations (is_public=false) are only visible to the creator unless explicitly shared via conversation_shares.';
comment on column public.conversations.remixed_from is 'If set, this conversation was remixed (copied) from another conversation. Points to the original.';

-- Enable RLS on the conversations table
alter table "public"."conversations" enable row level security;

-- Revoke default permissions
revoke all on public.conversations from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.conversations to authenticated;

-- Indexes
create index if not exists ix_conversations_project_id on public.conversations (project_id);
create index if not exists ix_conversations_task_id on public.conversations (task_id);
create index if not exists ix_conversations_slug on public.conversations (slug);
create unique index if not exists unique_conversations_slug_per_project on public.conversations (project_id, slug);

/*
 * -------------------------------------------------------
 * Section: Messages
 * Messages belong to conversations and represent individual messages in a conversation.
 * -------------------------------------------------------
 */

-- Messages table
create table if not exists public.messages (
  id uuid unique not null default extensions.uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  content jsonb not null default '{}'::jsonb,
  role text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id)
);

comment on table public.messages is 'Messages belong to conversations and represent individual messages in a conversation.';

comment on column public.messages.conversation_id is 'The conversation this message belongs to';
comment on column public.messages.content is 'The content of the message (JSON)';
comment on column public.messages.role is 'The role of the message (e.g., user, assistant, system)';
comment on column public.messages.metadata is 'Additional metadata for the message (JSON)';

-- Enable RLS on the messages table
alter table "public"."messages" enable row level security;

-- Revoke default permissions
revoke all on public.messages from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.messages to authenticated;

-- Indexes
create index if not exists ix_messages_conversation_id on public.messages (conversation_id);
create index if not exists ix_messages_created_at on public.messages (conversation_id, created_at);

/*
 * -------------------------------------------------------
 * Section: Notebooks
 * Notebooks belong to projects and contain cells with code and results.
 * Version history is maintained in notebook_versions.
 * -------------------------------------------------------
 */

-- Notebooks table
create table if not exists public.notebooks (
  id uuid unique not null default extensions.uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade not null,
  slug text not null,
  title varchar(255) not null,
  description text,
  datasources jsonb not null default '[]'::jsonb,
  cells jsonb not null default '[]'::jsonb,
  version integer not null default 1,
  is_public boolean default false not null,
  remixed_from uuid references public.notebooks(id) on delete set null,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  created_by uuid references auth.users,
  updated_by uuid references auth.users,
  primary key (id)
);

comment on table public.notebooks is 'Notebooks belong to projects and contain cells with code and results.';

comment on column public.notebooks.project_id is 'The project this notebook belongs to';
comment on column public.notebooks.slug is 'The slug of the notebook';
comment on column public.notebooks.title is 'The title of the notebook';
comment on column public.notebooks.description is 'The description of the notebook';
comment on column public.notebooks.datasources is 'Array of datasource IDs (JSON)';
comment on column public.notebooks.cells is 'Array of notebook cells (JSON)';
comment on column public.notebooks.version is 'The current version of the notebook';
comment on column public.notebooks.is_public is 'If true, this notebook is publicly viewable by anyone. Can be remixed by any user. Private notebooks (is_public=false) are only visible to the creator unless explicitly shared via notebook_shares.';
comment on column public.notebooks.remixed_from is 'If set, this notebook was remixed (copied) from another notebook. Points to the original.';
comment on column public.notebooks.created_by is 'The user who created this notebook. Used for ownership checks.';
comment on column public.notebooks.updated_by is 'The user who last updated this notebook.';

-- Notebook versions table
create table if not exists public.notebook_versions (
  version_id uuid unique not null default extensions.uuid_generate_v4(),
  notebook_id uuid references public.notebooks(id) on delete cascade not null,
  version integer not null,
  data jsonb not null,
  saved_at timestamp with time zone not null default now(),
  primary key (version_id)
);

comment on table public.notebook_versions is 'Version history for notebooks.';

comment on column public.notebook_versions.notebook_id is 'The notebook this version belongs to';
comment on column public.notebook_versions.version is 'The version number';
comment on column public.notebook_versions.data is 'The notebook data at this version (JSON)';
comment on column public.notebook_versions.saved_at is 'When this version was saved';

-- Enable RLS on the notebooks table
alter table "public"."notebooks" enable row level security;

-- Enable RLS on the notebook_versions table
alter table "public"."notebook_versions" enable row level security;

-- Revoke default permissions
revoke all on public.notebooks from authenticated, service_role;
revoke all on public.notebook_versions from authenticated, service_role;

-- Grant specific permissions
grant select, insert, update, delete on table public.notebooks to authenticated;
grant select, insert on table public.notebook_versions to authenticated;

-- Indexes for notebooks
create index if not exists ix_notebooks_project_id on public.notebooks (project_id);
create index if not exists ix_notebooks_slug on public.notebooks (slug);
create unique index if not exists unique_notebooks_slug_per_project on public.notebooks (project_id, slug);

-- Indexes for notebook_versions
create index if not exists ix_notebook_versions_notebook_id on public.notebook_versions (notebook_id);
create index if not exists ix_notebook_versions_version on public.notebook_versions (notebook_id, version);

/*
 * -------------------------------------------------------
 * Section: Sharing
 * Private sharing tables for notebooks and conversations.
 * Public sharing is handled via is_public flag on tables.
 * -------------------------------------------------------
 */

-- Notebook shares (for private sharing to specific organizations/users)
create table if not exists public.notebook_shares (
  id uuid unique not null default extensions.uuid_generate_v4(),
  notebook_id uuid references public.notebooks(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (id),
  unique(notebook_id, organization_id, user_id)
);

comment on table public.notebook_shares is 'Private sharing of notebooks to specific organizations or users.';

comment on column public.notebook_shares.notebook_id is 'The notebook being shared';
comment on column public.notebook_shares.organization_id is 'The organization this notebook is shared with (null if shared with specific user)';
comment on column public.notebook_shares.user_id is 'The user this notebook is shared with (null if shared with entire organization)';

-- Conversation shares (for private sharing to specific organizations/users)
create table if not exists public.conversation_shares (
  id uuid unique not null default extensions.uuid_generate_v4(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users on delete cascade,
  created_at timestamp with time zone default now(),
  primary key (id),
  unique(conversation_id, organization_id, user_id)
);

comment on table public.conversation_shares is 'Private sharing of conversations to specific organizations or users.';

comment on column public.conversation_shares.conversation_id is 'The conversation being shared';
comment on column public.conversation_shares.organization_id is 'The organization this conversation is shared with (null if shared with specific user)';
comment on column public.conversation_shares.user_id is 'The user this conversation is shared with (null if shared with entire organization)';

-- Enable RLS on sharing tables
alter table "public"."notebook_shares" enable row level security;
alter table "public"."conversation_shares" enable row level security;

-- Revoke default permissions
revoke all on public.notebook_shares from authenticated, service_role;
revoke all on public.conversation_shares from authenticated, service_role;

-- Grant specific permissions
grant select, insert, delete on table public.notebook_shares to authenticated;
grant select, insert, delete on table public.conversation_shares to authenticated;

-- Indexes
create index if not exists ix_notebook_shares_notebook_id on public.notebook_shares (notebook_id);
create index if not exists ix_notebook_shares_organization_id on public.notebook_shares (organization_id);
create index if not exists ix_notebook_shares_user_id on public.notebook_shares (user_id);

create index if not exists ix_conversation_shares_conversation_id on public.conversation_shares (conversation_id);
create index if not exists ix_conversation_shares_organization_id on public.conversation_shares (organization_id);
create index if not exists ix_conversation_shares_user_id on public.conversation_shares (user_id);
