/*
 * -------------------------------------------------------
 * Section: Credits Functions
 * PostgreSQL functions for credit management operations.
 * -------------------------------------------------------
 */

-- Function: Add Credits to Organization (Purchase)
create or replace function public.add_credits_to_organization(
  target_organization_id uuid,
  credits_amount integer,
  order_id text default null,
  description text default null
) returns public.credits_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_balance integer;
  new_balance integer;
  transaction_record public.credits_transactions;
begin
  -- Get current balance (with row lock to prevent race conditions)
  select credits_balance into current_balance
  from public.organizations
  where id = target_organization_id
  for update;
  
  if not found then
    raise exception 'Organization not found: %', target_organization_id;
  end if;
  
  -- Calculate new balance
  new_balance := current_balance + credits_amount;
  
  -- Update organization balance atomically
  update public.organizations
  set 
    credits_balance = new_balance,
    credits_total_purchased = credits_total_purchased + credits_amount,
    updated_at = now()
  where id = target_organization_id;
  
  -- Create transaction record
  insert into public.credits_transactions (
    organization_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    order_id,
    description,
    created_by
  ) values (
    target_organization_id,
    'purchase',
    credits_amount,
    current_balance,
    new_balance,
    order_id,
    description,
    auth.uid()
  ) returning * into transaction_record;
  
  return transaction_record;
end;
$$;

comment on function public.add_credits_to_organization is 'Adds credits to an organization from a purchase';

grant execute on function public.add_credits_to_organization(
  uuid, integer, text, text
) to service_role;

-- Function: Consume Credits (Usage)
create or replace function public.consume_credits(
  target_organization_id uuid,
  target_project_id uuid,
  target_user_id uuid,
  credits_amount integer,
  usage_id uuid,
  consumption_type text,
  consumption_amount numeric,
  description text default null
) returns public.credits_transactions
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

comment on function public.consume_credits is 'Consumes credits for usage, enforcing hard limits on project and user quotas';

grant execute on function public.consume_credits(
  uuid, uuid, uuid, integer, uuid, text, numeric, text
) to service_role;

-- Function: Calculate Credits from Purchase Amount (Volume Pricing)
create or replace function public.calculate_credits_from_amount(
  amount_cents integer
) returns integer
language plpgsql
stable
as $$
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
$$;

comment on function public.calculate_credits_from_amount is 'Calculates credits from purchase amount using volume pricing tiers';

grant execute on function public.calculate_credits_from_amount(integer) to authenticated, service_role;

-- Function: Allocate Credits to Project/User
create or replace function public.allocate_credits_quota(
  target_organization_id uuid,
  credits_amount integer,
  target_project_id uuid default null,
  target_user_id uuid default null,
  description text default null
) returns public.credits_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_balance integer;
  new_balance integer;
  transaction_record public.credits_transactions;
begin
  -- Validate: must specify either project or user, not both
  if (target_project_id is null and target_user_id is null) or 
     (target_project_id is not null and target_user_id is not null) then
    raise exception 'Must specify either project_id or user_id, not both';
  end if;
  
  -- Get current balance (with lock)
  select credits_balance into current_balance
  from public.organizations
  where id = target_organization_id
  for update;
  
  if current_balance < credits_amount then
    raise exception 'Insufficient credits for allocation. Balance: %, Requested: %', 
      current_balance, credits_amount;
  end if;
  
  new_balance := current_balance - credits_amount;
  
  -- Update organization balance
  update public.organizations
  set 
    credits_balance = new_balance,
    credits_total_allocated = credits_total_allocated + credits_amount,
    updated_at = now()
  where id = target_organization_id;
  
  -- Update project quota
  if target_project_id is not null then
    insert into public.project_quotas (
      organization_id, project_id, credits_allocated, credits_used
    ) values (
      target_organization_id, target_project_id, credits_amount, 0
    )
    on conflict (project_id) 
    do update set 
      credits_allocated = project_quotas.credits_allocated + credits_amount,
      updated_at = now();
  end if;
  
  -- Update user quota
  if target_user_id is not null then
    insert into public.user_quotas (
      organization_id, user_id, credits_allocated, credits_used
    ) values (
      target_organization_id, target_user_id, credits_amount, 0
    )
    on conflict (organization_id, user_id) 
    do update set 
      credits_allocated = user_quotas.credits_allocated + credits_amount,
      updated_at = now();
  end if;
  
  -- Create transaction record
  insert into public.credits_transactions (
    organization_id,
    transaction_type,
    credits_amount,
    balance_before,
    balance_after,
    project_id,
    user_id,
    description,
    created_by
  ) values (
    target_organization_id,
    'allocation',
    -credits_amount, -- Negative (deducted from org balance)
    current_balance,
    new_balance,
    target_project_id,
    target_user_id,
    description,
    auth.uid()
  ) returning * into transaction_record;
  
  return transaction_record;
end;
$$;

comment on function public.allocate_credits_quota is 'Allocates credits from organization balance to project or user quota';

grant execute on function public.allocate_credits_quota(
  uuid, integer, uuid, uuid, text
) to service_role;

/*
 * -------------------------------------------------------
 * Section: Credits Ledger Triggers
 * Triggers to automatically update credits_transactions when orders or usage are inserted.
 * -------------------------------------------------------
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

/*
 * -------------------------------------------------------
 * Section: Welcome Credits Trigger
 * Adds 100 free credits when a new account (user) is created.
 * -------------------------------------------------------
 */

-- Trigger: Add 100 welcome credits when a new account is created
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
    100,
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

