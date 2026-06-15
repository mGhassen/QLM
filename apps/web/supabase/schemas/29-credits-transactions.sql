/*
 * -------------------------------------------------------
 * Section: Credits Transactions
 * Credits transactions is the credit ledger tracking all credit movements (purchases, consumption, allocations).
 * This is the single source of truth for credit balance calculations.
 * -------------------------------------------------------
 */

-- Credits Transactions table (Credit Ledger)
create table if not exists public.credits_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade not null,
  
  -- Transaction classification
  transaction_type text not null check (transaction_type in ('purchase', 'consumption', 'allocation', 'deallocation', 'adjustment')),
  
  -- Credit movement
  credits_amount integer not null, -- positive for purchases/allocations, negative for consumption/deallocations
  balance_before integer not null,
  balance_after integer not null,
  
  -- Source tracking
  order_id text references public.orders(id) on delete set null, -- For purchases
  usage_id uuid references public.usage(id), -- For consumption
  project_id uuid references public.projects(id), -- For project quotas
  user_id uuid references auth.users, -- For user quotas
  
  -- Consumption details (for consumption transactions)
  consumption_type text check (consumption_type in ('storage', 'tokens', 'cpu', 'gpu', 'network')),
  consumption_amount numeric, -- e.g., GB for storage, tokens for AI, hours for compute
  
  -- Metadata
  description text,
  metadata jsonb default '{}'::jsonb,
  
  created_at timestamptz not null default now(),
  created_by uuid references auth.users
);

comment on table public.credits_transactions is 'Credit ledger tracking all credit movements (purchases, consumption, allocations)';
comment on column public.credits_transactions.transaction_type is 'Type of transaction: purchase, consumption, allocation, deallocation, adjustment';
comment on column public.credits_transactions.credits_amount is 'Credit amount (positive for additions, negative for deductions)';
comment on column public.credits_transactions.balance_before is 'Organization balance before this transaction';
comment on column public.credits_transactions.balance_after is 'Organization balance after this transaction';
comment on column public.credits_transactions.consumption_type is 'Type of consumption: storage, tokens, cpu, gpu, network';
comment on column public.credits_transactions.organization_id is 'The organization this transaction belongs to';

-- Indexes for efficient queries
create index if not exists ix_credits_transactions_org_type 
  on public.credits_transactions(organization_id, transaction_type);
create index if not exists ix_credits_transactions_order 
  on public.credits_transactions(order_id) where order_id is not null;
create index if not exists ix_credits_transactions_usage 
  on public.credits_transactions(usage_id) where usage_id is not null;
create index if not exists ix_credits_transactions_project 
  on public.credits_transactions(project_id) where project_id is not null;
create index if not exists ix_credits_transactions_created_at 
  on public.credits_transactions(created_at desc);

-- RLS Policies
alter table public.credits_transactions enable row level security;

create policy "credits_transactions_read" 
on public.credits_transactions for select
to authenticated using (
  public.has_role_on_organization(organization_id)
);

-- Grant permissions
grant select on table public.credits_transactions to authenticated;
grant select, insert, update, delete on table public.credits_transactions to service_role;

