\echo '[01_init.sql] start'

SET client_min_messages = WARNING;

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- index: nothing
CREATE TABLE IF NOT EXISTS nothing_b_tree_products (
  id            BIGSERIAL    PRIMARY KEY,
  name          TEXT         NOT NULL,
  category      TEXT         NOT NULL,
  status        TEXT         NOT NULL,
  price         INTEGER      NOT NULL      CHECK (price >= 0),
  description   TEXT         NOT NULL      DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL      DEFAULT now()
);

-- index: price
CREATE TABLE IF NOT EXISTS single_b_tree_products (
  id            BIGSERIAL    PRIMARY KEY,
  name          TEXT         NOT NULL,
  category      TEXT         NOT NULL,
  status        TEXT         NOT NULL,
  price         INTEGER      NOT NULL      CHECK (price >= 0),
  description   TEXT         NOT NULL      DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL      DEFAULT now()
);

-- index: price, name
CREATE TABLE IF NOT EXISTS double_b_tree_products (
  id            BIGSERIAL    PRIMARY KEY,
  name          TEXT         NOT NULL,
  category      TEXT         NOT NULL,
  status        TEXT         NOT NULL,
  price         INTEGER      NOT NULL      CHECK (price >= 0),
  description   TEXT         NOT NULL      DEFAULT '',
  created_at    TIMESTAMPTZ  NOT NULL      DEFAULT now()
);

\echo '[01_init.sql] done'