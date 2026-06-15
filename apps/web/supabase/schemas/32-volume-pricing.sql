/*
 * -------------------------------------------------------
 * Section: Volume Pricing Tiers
 * Volume pricing tiers define credit multipliers based on purchase amount.
 * Base pricing: $1 = 1 credit, with volume discounts for larger purchases.
 * -------------------------------------------------------
 */

-- Volume Pricing Configuration Table
create table if not exists public.volume_pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  
  -- Tier definition
  min_amount_cents integer not null, -- Minimum purchase amount in cents
  max_amount_cents integer, -- NULL = no upper limit
  credits_multiplier numeric(10, 4) not null default 1.0, -- e.g., 1.1 = 10% bonus
  
  -- Metadata
  tier_name text,
  description text,
  is_active boolean default true,
  priority integer default 0, -- Higher priority = evaluated first
  
  created_at timestamptz not null default now()
);

comment on table public.volume_pricing_tiers is 'Volume pricing tiers for credit purchases';
comment on column public.volume_pricing_tiers.min_amount_cents is 'Minimum purchase amount in cents for this tier';
comment on column public.volume_pricing_tiers.max_amount_cents is 'Maximum purchase amount in cents (NULL = no limit)';
comment on column public.volume_pricing_tiers.credits_multiplier is 'Credit multiplier (e.g., 1.1 = 10% bonus credits)';
comment on column public.volume_pricing_tiers.priority is 'Evaluation priority (higher = evaluated first)';

-- Indexes
create index if not exists ix_volume_pricing_tiers_active on public.volume_pricing_tiers(is_active, priority desc);

-- Enable RLS on the volume_pricing_tiers table
alter table public.volume_pricing_tiers enable row level security;

-- Revoke default permissions
revoke all on public.volume_pricing_tiers from authenticated, service_role;

-- Grant specific permissions
grant select on table public.volume_pricing_tiers to authenticated, service_role;

-- RLS policies
-- SELECT: All authenticated users can read volume pricing tiers (public reference data)
create policy "volume_pricing_tiers_read" on public.volume_pricing_tiers
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for authenticated users - this is read-only reference data
-- Only service_role can modify via direct grants (bypasses RLS)

-- Default tiers: $1 = 1 credit base, volume discounts
insert into public.volume_pricing_tiers (min_amount_cents, max_amount_cents, credits_multiplier, tier_name, priority) values
  (0, 9999, 1.0, 'Standard', 0), -- $0-$99.99: 1x
  (10000, 49999, 1.1, 'Volume 1', 1), -- $100-$499.99: 1.1x (10% bonus)
  (50000, 99999, 1.2, 'Volume 2', 2), -- $500-$999.99: 1.2x (20% bonus)
  (100000, null, 1.3, 'Volume 3', 3) -- $1000+: 1.3x (30% bonus)
on conflict do nothing;

