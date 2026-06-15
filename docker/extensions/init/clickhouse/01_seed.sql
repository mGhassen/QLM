CREATE TABLE IF NOT EXISTS extensions.orders (
  id UInt32,
  customer String,
  amount Decimal(10, 2),
  created_at DateTime DEFAULT now()
)
ENGINE = MergeTree
ORDER BY id;

INSERT INTO extensions.orders (id, customer, amount)
VALUES
  (1, 'alice', 120.50),
  (2, 'bob', 74.90),
  (3, 'charlie', 15.00);
