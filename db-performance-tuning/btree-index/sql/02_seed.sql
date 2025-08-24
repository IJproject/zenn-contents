\echo '[02_seed.sql] start'

SET client_min_messages = WARNING;

\set ROWS 1000000

BEGIN;
SET LOCAL synchronous_commit = off;
SET LOCAL work_mem = '128MB';
SET LOCAL maintenance_work_mem = '2GB';

INSERT INTO nothing_b_tree_products (name, category, status, price, description, created_at)
SELECT
  'Product ' || g,
  (ARRAY['book','toy','fashion','food','gadget','tool'])[1 + (random()*5)::int]        AS category,
  (ARRAY['new','paid','shipped','canceled','returned'])[1 + (random()*4)::int]         AS status,
  (10 + (random()*990))::int * 100                                                     AS price,
  CASE WHEN random() < 0.30 THEN repeat('x', 20 + (random()*200)::int) ELSE '' END     AS description,
  now() - ((random()*720)::int) * interval '1 day'                                     AS created_at
FROM generate_series(1, :ROWS) AS g;

INSERT INTO single_b_tree_products (name, category, status, price, description, created_at)
SELECT name, category, status, price, description, created_at
FROM nothing_b_tree_products;

INSERT INTO double_b_tree_products (name, category, status, price, description, created_at)
SELECT name, category, status, price, description, created_at
FROM nothing_b_tree_products;

COMMIT;

SELECT setval(pg_get_serial_sequence('nothing_b_tree_products','id'),
              COALESCE((SELECT max(id) FROM nothing_b_tree_products), 0), true);
SELECT setval(pg_get_serial_sequence('single_b_tree_products','id'),
              COALESCE((SELECT max(id) FROM single_b_tree_products), 0), true);
SELECT setval(pg_get_serial_sequence('double_b_tree_products','id'),
              COALESCE((SELECT max(id) FROM double_b_tree_products), 0), true);

ANALYZE nothing_b_tree_products;
ANALYZE single_b_tree_products;
ANALYZE double_b_tree_products;

\echo '[02_seed.sql] done'