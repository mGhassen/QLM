-- Add free credits to an organization

select public.add_credits_to_organization(
  'YOUR_ORGANIZATION_ID'::uuid,  -- organization UUID
  100,                            -- number of credits
  null,                           -- order_id (null = free credits)
  'Free credits'                  -- description
);