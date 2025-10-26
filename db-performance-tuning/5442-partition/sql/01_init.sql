\echo '[01_init.sql] start'

SET client_min_messages = WARNING;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- ===============================
-- 1. パーティションなし（通常テーブル）
-- ===============================
CREATE TABLE IF NOT EXISTS no_partition_orders (
  id            BIGSERIAL,
  customer_id   BIGINT       NOT NULL,
  order_date    DATE         NOT NULL,
  status        TEXT         NOT NULL,
  region        TEXT         NOT NULL,
  amount        INTEGER      NOT NULL      CHECK (amount >= 0),
  description   TEXT         NOT NULL      DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL      DEFAULT now(),
  PRIMARY KEY (id)
);

-- ===============================
-- 2. レンジパーティション（日付ベース）
-- ===============================
CREATE TABLE IF NOT EXISTS range_partition_orders (
  id            BIGSERIAL,
  customer_id   BIGINT       NOT NULL,
  order_date    DATE         NOT NULL,
  status        TEXT         NOT NULL,
  region        TEXT         NOT NULL,
  amount        INTEGER      NOT NULL      CHECK (amount >= 0),
  description   TEXT         NOT NULL      DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL      DEFAULT now(),
  PRIMARY KEY (id, order_date)
) PARTITION BY RANGE (order_date);

-- 2024年の月別パーティション作成
CREATE TABLE range_partition_orders_2024_01 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE range_partition_orders_2024_02 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
CREATE TABLE range_partition_orders_2024_03 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');
CREATE TABLE range_partition_orders_2024_04 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-04-01') TO ('2024-05-01');
CREATE TABLE range_partition_orders_2024_05 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-05-01') TO ('2024-06-01');
CREATE TABLE range_partition_orders_2024_06 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');
CREATE TABLE range_partition_orders_2024_07 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-07-01') TO ('2024-08-01');
CREATE TABLE range_partition_orders_2024_08 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-08-01') TO ('2024-09-01');
CREATE TABLE range_partition_orders_2024_09 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-09-01') TO ('2024-10-01');
CREATE TABLE range_partition_orders_2024_10 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');
CREATE TABLE range_partition_orders_2024_11 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');
CREATE TABLE range_partition_orders_2024_12 PARTITION OF range_partition_orders
  FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- ===============================
-- 3. リストパーティション（地域ベース）
-- ===============================
CREATE TABLE IF NOT EXISTS list_partition_orders (
  id            BIGSERIAL,
  customer_id   BIGINT       NOT NULL,
  order_date    DATE         NOT NULL,
  status        TEXT         NOT NULL,
  region        TEXT         NOT NULL,
  amount        INTEGER      NOT NULL      CHECK (amount >= 0),
  description   TEXT         NOT NULL      DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL      DEFAULT now(),
  PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

-- 地域別パーティション作成
CREATE TABLE list_partition_orders_asia PARTITION OF list_partition_orders
  FOR VALUES IN ('japan', 'china', 'korea', 'india', 'singapore');
CREATE TABLE list_partition_orders_europe PARTITION OF list_partition_orders
  FOR VALUES IN ('uk', 'germany', 'france', 'italy', 'spain');
CREATE TABLE list_partition_orders_americas PARTITION OF list_partition_orders
  FOR VALUES IN ('usa', 'canada', 'mexico', 'brazil', 'argentina');
CREATE TABLE list_partition_orders_others PARTITION OF list_partition_orders
  FOR VALUES IN ('australia', 'russia', 'egypt', 'south_africa', 'other');

-- ===============================
-- 4. ハッシュパーティション（customer_idベース）
-- ===============================
CREATE TABLE IF NOT EXISTS hash_partition_orders (
  id            BIGSERIAL,
  customer_id   BIGINT       NOT NULL,
  order_date    DATE         NOT NULL,
  status        TEXT         NOT NULL,
  region        TEXT         NOT NULL,
  amount        INTEGER      NOT NULL      CHECK (amount >= 0),
  description   TEXT         NOT NULL      DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL      DEFAULT now(),
  PRIMARY KEY (id, customer_id)
) PARTITION BY HASH (customer_id);

-- 4つのハッシュパーティション作成
CREATE TABLE hash_partition_orders_0 PARTITION OF hash_partition_orders
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE hash_partition_orders_1 PARTITION OF hash_partition_orders
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE hash_partition_orders_2 PARTITION OF hash_partition_orders
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE hash_partition_orders_3 PARTITION OF hash_partition_orders
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

\echo '[01_init.sql] done'