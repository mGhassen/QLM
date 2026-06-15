drop trigger if exists "set_usage_timestamp_id" on "public"."usage";

revoke references on table "public"."todos" from "authenticated";

revoke trigger on table "public"."todos" from "authenticated";

revoke truncate on table "public"."todos" from "authenticated";

revoke references on table "public"."todos" from "service_role";

revoke trigger on table "public"."todos" from "service_role";

revoke truncate on table "public"."todos" from "service_role";

drop function if exists "public"."consume_credits"(target_organization_id uuid, target_project_id uuid, target_user_id uuid, credits_amount integer, usage_id bigint, consumption_type text, consumption_amount numeric, description text);

drop function if exists "public"."trigger_set_usage_timestamp_id"();

drop function if exists "public"."generate_usage_timestamp_id"();

alter table "public"."credits_transactions" drop column "usage_id";

alter table "public"."usage" add column "cost" numeric not null default 0;

alter table "public"."usage" add column "created_at" timestamp with time zone not null default CURRENT_TIMESTAMP;

alter table "public"."usage" drop constraint "usage_pkey";

alter table "public"."usage" drop column "id";

alter table "public"."usage" add column "id" uuid not null default extensions.uuid_generate_v4();

alter table "public"."usage" add primary key ("id");

create index if not exists ix_usage_id on public.usage (id desc);

drop sequence if exists "public"."usage_id_collision_seq";

alter table "public"."credits_transactions" add column "usage_id" uuid references public.usage(id);

create index if not exists ix_credits_transactions_usage on public.credits_transactions(usage_id) where usage_id is not null;

CREATE INDEX ix_usage_created_at ON public.usage USING btree (created_at desc);

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.consume_credits(target_organization_id uuid, target_project_id uuid, target_user_id uuid, credits_amount integer, usage_id uuid, consumption_type text, consumption_amount numeric, description text DEFAULT NULL::text)
 RETURNS public.credits_transactions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_balance integer;
  new_balance integer;
  project_quota_remaining integer;
  user_quota_remaining integer;
  transaction_record public.credits_transactions;
begin
  -- Check project quota (hard limit)
  select credits_remaining into project_quota_remaining
  from public.project_quotas
  where project_id = target_project_id and is_active = true;
  
  if project_quota_remaining is not null and project_quota_remaining < credits_amount then
    raise exception 'Project quota exceeded. Remaining: %, Requested: %', 
      project_quota_remaining, credits_amount;
  end if;
  
  -- Check user quota (hard limit)
  select credits_remaining into user_quota_remaining
  from public.user_quotas
  where organization_id = target_organization_id 
    and user_id = target_user_id 
    and is_active = true;
  
  if user_quota_remaining is not null and user_quota_remaining < credits_amount then
    raise exception 'User quota exceeded. Remaining: %, Requested: %', 
      user_quota_remaining, credits_amount;
  end if;
  
  -- Get current org balance (with lock)
  select credits_balance into current_balance
  from public.organizations
  where id = target_organization_id
  for update;
  
  if current_balance < credits_amount then
    raise exception 'Insufficient credits. Balance: %, Requested: %', 
      current_balance, credits_amount;
  end if;
  
  new_balance := current_balance - credits_amount;
  
  -- Update organization balance
  update public.organizations
  set 
    credits_balance = new_balance,
    credits_total_consumed = credits_total_consumed + credits_amount,
    updated_at = now()
  where id = target_organization_id;
  
  -- Update project quota if exists
  if project_quota_remaining is not null then
    update public.project_quotas
    set credits_used = credits_used + credits_amount,
        updated_at = now()
    where project_id = target_project_id;
  end if;
  
  -- Update user quota if exists
  if user_quota_remaining is not null then
    update public.user_quotas
    set credits_used = credits_used + credits_amount,
        updated_at = now()
    where organization_id = target_organization_id and user_id = target_user_id;
  end if;
  
  -- Create transaction record
  insert into public.credits_transactions (
    organization_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    usage_id,
    project_id,
    user_id,
    consumption_type,
    consumption_amount,
    description,
    created_by
  ) values (
    target_organization_id,
    'consumption',
    -credits_amount, -- Negative for consumption
    current_balance,
    new_balance,
    usage_id,
    target_project_id,
    target_user_id,
    consumption_type,
    consumption_amount,
    description,
    auth.uid()
  ) returning * into transaction_record;
  
  return transaction_record;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_credits_from_amount(amount_cents integer)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  base_credits integer;
  multiplier numeric;
  final_credits integer;
begin
  -- Base: $1 = 100 credits, so $10 = 1000 credits (amount_cents directly)
  base_credits := amount_cents;
  
  -- Find applicable tier multiplier
  select credits_multiplier into multiplier
  from public.volume_pricing_tiers
  where amount_cents >= min_amount_cents
    and (max_amount_cents is null or amount_cents <= max_amount_cents)
    and is_active = true
  order by priority desc
  limit 1;
  
  -- Default to 1.0 if no tier found
  if multiplier is null then
    multiplier := 1.0;
  end if;
  
  -- Apply multiplier
  final_credits := floor(base_credits * multiplier);
  
  return final_credits;
end;
$function$
;

/*
 * Credits Ledger Triggers
 * Triggers to automatically update credits_transactions when orders or usage are inserted.
 */

-- Trigger: Add credits when order status is succeeded (purchase)
create or replace function public.trigger_on_order_credits_purchase()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  credits_amount integer;
  purchase_exists boolean;
begin
  if NEW.status <> 'succeeded' then
    return NEW;
  end if;

  -- Idempotency: skip if purchase transaction already exists for this order
  select exists(
    select 1 from public.credits_transactions
    where order_id = NEW.id and transaction_type = 'purchase'
  ) into purchase_exists;

  if purchase_exists then
    return NEW;
  end if;

  -- Calculate credits from order total_amount (in cents)
  credits_amount := public.calculate_credits_from_amount((NEW.total_amount)::integer);

  if credits_amount <= 0 then
    return NEW;
  end if;

  perform public.add_credits_to_organization(
    NEW.organization_id,
    credits_amount,
    NEW.id,
    'Credits purchase from order ' || NEW.id
  );

  return NEW;
end;
$$;

comment on function public.trigger_on_order_credits_purchase is 'Adds credits to organization when order status is succeeded; idempotent per order';

create trigger credits_on_order_purchase
  after insert or update of status on public.orders
  for each row
  execute function public.trigger_on_order_credits_purchase();

-- Trigger: Consume credits when usage is inserted with credits_used > 0
create or replace function public.trigger_on_usage_consumption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if NEW.credits_used <= 0 then
    return NEW;
  end if;

  perform public.consume_credits(
    NEW.organization_id,
    NEW.project_id,
    NEW.user_id,
    NEW.credits_used,
    NEW.id,
    'tokens',
    NEW.total_tokens::numeric,
    'Usage consumption: ' || NEW.model || ' (' || NEW.total_tokens || ' tokens)'
  );

  return NEW;
end;
$$;

comment on function public.trigger_on_usage_consumption is 'Consumes credits when usage record is inserted with credits_used > 0';

create trigger credits_on_usage_insert
  after insert on public.usage
  for each row
  execute function public.trigger_on_usage_consumption();

-- Trigger: Add 1000 welcome credits when a new account is created
create or replace function public.trigger_on_account_welcome_credits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_org_id uuid;
  org_slug text;
  owner_role varchar(50);
begin
  -- Create default organization for the new user
  new_org_id := extensions.uuid_generate_v4();
  org_slug := 'personal-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.organizations (
    id,
    user_id,
    name,
    slug,
    created_at,
    updated_at
  ) values (
    new_org_id,
    NEW.user_id,
    coalesce(nullif(trim(NEW.name), ''), 'Personal'),
    org_slug,
    now(),
    now()
  );

  -- Add user as owner (add_current_user_to_new_organization may not fire when auth.uid() is null)
  select public.get_upper_system_role() into owner_role;
  insert into public.organization_memberships (
    organization_id,
    user_id,
    account_role,
    created_at,
    updated_at
  ) values (
    new_org_id,
    NEW.user_id,
    owner_role,
    now(),
    now()
  )
  on conflict (user_id, organization_id) do nothing;

  -- Add 100 welcome credits
  perform public.add_credits_to_organization(
    new_org_id,
    1000,
    null,
    'Welcome credits for new user'
  );

  return NEW;
end;
$$;

comment on function public.trigger_on_account_welcome_credits is 'Creates default organization and adds 100 welcome credits when a new account is created';

create trigger credits_on_account_created
  after insert on public.accounts
  for each row
  execute function public.trigger_on_account_welcome_credits();
