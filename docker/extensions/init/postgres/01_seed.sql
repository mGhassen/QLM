CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  customer TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.orders (customer, amount)
VALUES
  ('alice', 120.50),
  ('bob', 74.90),
  ('charlie', 15.00);
