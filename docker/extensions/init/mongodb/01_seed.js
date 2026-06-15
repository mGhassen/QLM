db = db.getSiblingDB('extensions');

db.orders.insertMany([
  { id: 1, customer: 'alice', amount: 120.5, created_at: new Date() },
  { id: 2, customer: 'bob', amount: 74.9, created_at: new Date() },
  { id: 3, customer: 'charlie', amount: 15.0, created_at: new Date() },
]);
