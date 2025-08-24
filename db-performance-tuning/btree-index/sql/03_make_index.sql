\echo '[03_make_index.sql] start'

SET client_min_messages = WARNING;

CREATE INDEX IF NOT EXISTS idx_single_price   ON single_b_tree_products (price);

CREATE INDEX IF NOT EXISTS idx_double_price_name ON double_b_tree_products (price, name);

-- 統計情報の更新
ANALYZE nothing_b_tree_products;
ANALYZE single_b_tree_products;
ANALYZE double_b_tree_products;

\echo '[03_make_index.sql] done'