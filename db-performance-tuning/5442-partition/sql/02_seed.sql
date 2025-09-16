\echo '[02_seed.sql] start'

SET client_min_messages = WARNING;

\set ROWS 1000000
\set REGIONS '''japan'',''china'',''korea'',''india'',''singapore'',''uk'',''germany'',''france'',''italy'',''spain'',''usa'',''canada'',''mexico'',''brazil'',''argentina'',''australia'',''russia'',''egypt'',''south_africa'',''other'''
\set STATUSES '''pending'',''processing'',''shipped'',''delivered'',''canceled'',''returned'''

-- トランザクションスタート
BEGIN;

-- no_partition_ordersテーブルの作成
INSERT INTO no_partition_orders (customer_id, order_date, status, region, amount, description, created_at)
SELECT
  1 + (random()*100000)::int                                                         AS customer_id,
  '2024-01-01'::date + ((random()*364)::int) * interval '1 day'                    AS order_date,
  (ARRAY[:STATUSES])[1 + (random()*5)::int]                                         AS status,
  (ARRAY[:REGIONS])[1 + (random()*19)::int]                                         AS region,
  (10 + (random()*990))::int * 100                                                  AS amount,
  CASE WHEN random() < 0.30 THEN repeat('x', 20 + (random()*200)::int) ELSE '' END AS description,
  now() - ((random()*365)::int) * interval '1 day'                                 AS created_at
FROM generate_series(1, :ROWS) AS g;

-- range_partition_ordersテーブルにデータをコピー
INSERT INTO range_partition_orders (customer_id, order_date, status, region, amount, description, created_at)
SELECT customer_id, order_date, status, region, amount, description, created_at
FROM no_partition_orders;

-- list_partition_ordersテーブルにデータをコピー
INSERT INTO list_partition_orders (customer_id, order_date, status, region, amount, description, created_at)
SELECT customer_id, order_date, status, region, amount, description, created_at
FROM no_partition_orders;

-- hash_partition_ordersテーブルにデータをコピー
INSERT INTO hash_partition_orders (customer_id, order_date, status, region, amount, description, created_at)
SELECT customer_id, order_date, status, region, amount, description, created_at
FROM no_partition_orders;

-- トランザクションコミット
COMMIT;

-- シーケンス位置の調整
SELECT setval(pg_get_serial_sequence('no_partition_orders','id'),
              COALESCE((SELECT max(id) FROM no_partition_orders), 0), true);
SELECT setval(pg_get_serial_sequence('range_partition_orders','id'),
              COALESCE((SELECT max(id) FROM range_partition_orders), 0), true);
SELECT setval(pg_get_serial_sequence('list_partition_orders','id'),
              COALESCE((SELECT max(id) FROM list_partition_orders), 0), true);
SELECT setval(pg_get_serial_sequence('hash_partition_orders','id'),
              COALESCE((SELECT max(id) FROM hash_partition_orders), 0), true);

-- 統計情報の更新
ANALYZE no_partition_orders;
ANALYZE range_partition_orders;
ANALYZE list_partition_orders;
ANALYZE hash_partition_orders;

\echo '[02_seed.sql] done'