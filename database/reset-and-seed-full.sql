-- Reset and Seed ALL data for Trade Guide (safe to run in Supabase SQL Editor)
-- This recreates products, cities (with 3 buyables each), a complete symmetric
-- distance graph between all cities, and price records for ALL (city, product)
-- pairs (buy_price only for each city's 3 buyables; sell_price everywhere).
-- It preserves/creates the admin user (username: admin, PIN: 1234).

BEGIN;

-- 0) Keep or (re)create admin
INSERT INTO users (id, username, pin_hash, approved, is_admin)
VALUES (
  'admin',
  'admin',
  '$2a$10$F9yNecDCbJsacz8/HYgccO1eY6mvdlnqWnciIErU8TS4ve4bS6fOe', -- '1234'
  true,
  true
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  pin_hash = EXCLUDED.pin_hash,
  approved = true,
  is_admin = true;

-- (MVP) Open up cities table for writes if RLS blocks anon writes in this environment
DO $$ BEGIN
  CREATE POLICY IF NOT EXISTS "任何人可以管理城市(MVP)" ON cities FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN others THEN NULL; END $$;

-- 1) Reset application data (preserve admin)
-- Use single TRUNCATE with CASCADE to satisfy FK constraints between these tables
TRUNCATE TABLE
  price_records,
  edges,
  cities,
  products,
  audit_logs
RESTART IDENTITY CASCADE;
DELETE FROM users WHERE id <> 'admin';

-- 2) Seed products (25)
INSERT INTO products (id, name, weight) VALUES
('tea', '茗茶', 50),
('silk', '绢帛', 40),
('porcelain', '瓷器', 120),
('jade', '白玉', 50),
('gold', '赤金', 200),
('iron', '精铁', 180),
('spice', '香料', 30),
('herb', '灵草', 20),
('lacquer', '漆器', 90),
('scroll', '书卷', 25),
('ink', '墨锭', 35),
('paper', '宣纸', 15),
('bamboo', '竹材', 60),
('tea_brick', '茶砖', 70),
('salt', '井盐', 110),
('fur', '兽皮', 140),
('horse', '骏马', 400),
('copper', '赤铜', 160),
('silver', '白银', 180),
('ceramic', '粗陶', 100),
('glass', '琉璃', 130),
('dye', '染料', 55),
('sugar', '红糖', 80),
('jadeite', '翠玉', 55),
('pearl', '南珠', 45);

-- 3) Seed cities (20) with deterministic 3 buyables (rotating across product list)
WITH city_seed(id, name, ci) AS (
  VALUES
    ('chang_an', '长安', 0),
    ('luo_shui', '洛水', 1),
    ('yun_zhou', '云州', 2),
    ('yan_ran', '燕然', 3),
    ('lin_hai', '临海', 4),
    ('jian_ye', '建业', 5),
    ('jiang_ling', '江陵', 6),
    ('jing_men', '荆门', 7),
    ('guang_ling', '广陵', 8),
    ('cheng_du', '成都', 9),
    ('e_mei', '峨眉', 10),
    ('liang_zhou', '凉州', 11),
    ('sha_zhou', '沙州', 12),
    ('gui_lin', '桂林', 13),
    ('yang_zhou', '扬州', 14),
    ('ye_cheng', '邺城', 15),
    ('jin_yang', '晋阳', 16),
    ('hui_ji', '会稽', 17),
    ('bei_hai', '北海', 18),
    ('xi_ling', '西陵', 19)
), prod_ord AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS pi FROM products
), pc(cnt) AS (
  SELECT COUNT(*) FROM products
)
INSERT INTO cities (id, name, buyable_product_ids, created_by)
SELECT cs.id, cs.name,
  ARRAY[
    (SELECT id FROM prod_ord WHERE pi = (cs.ci     ) % (SELECT cnt FROM pc)),
    (SELECT id FROM prod_ord WHERE pi = (cs.ci + 1 ) % (SELECT cnt FROM pc)),
    (SELECT id FROM prod_ord WHERE pi = (cs.ci + 2 ) % (SELECT cnt FROM pc))
  ]::TEXT[],
  'admin'
FROM city_seed cs;

-- 4) Seed complete symmetric graph: for every ordered pair (a != b)
WITH c AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS idx FROM cities
)
INSERT INTO edges (from_city_id, to_city_id, distance, created_by)
SELECT a.id, b.id,
       3 + ((ABS(a.idx - b.idx) * 3 + (a.idx + b.idx)) % 17), -- distances in [3,19]
       'admin'
FROM c a CROSS JOIN c b
WHERE a.id <> b.id;

-- 5) Seed prices for ALL city-product pairs
-- Buy price only for each city's 3 buyables; sell price for all
WITH c AS (
  SELECT id AS city_id, ROW_NUMBER() OVER (ORDER BY id) - 1 AS ci FROM cities
), p AS (
  SELECT id AS product_id, weight, (50 + weight) AS base_price FROM products
), buyables AS (
  SELECT id AS city_id, unnest(buyable_product_ids) AS product_id FROM cities
), grid AS (
  SELECT c.city_id, c.ci, p.product_id, p.base_price
  FROM c CROSS JOIN p
), priced AS (
  SELECT
    g.city_id,
    g.product_id,
    CASE WHEN EXISTS (
      SELECT 1 FROM buyables b WHERE b.city_id = g.city_id AND b.product_id = g.product_id
    ) THEN GREATEST(1, g.base_price - 40 + (g.ci % 10)) ELSE NULL END AS buy_price,
    (g.base_price + 20 + (g.ci % 10)) AS sell_price
  FROM grid g
)
INSERT INTO price_records (city_id, product_id, buy_price, sell_price, updated_by)
SELECT city_id, product_id, buy_price, sell_price, 'admin' FROM priced
ON CONFLICT (city_id, product_id)
DO UPDATE SET
  buy_price = EXCLUDED.buy_price,
  sell_price = EXCLUDED.sell_price,
  updated_at = NOW(),
  updated_by = 'admin';

COMMIT;

-- How to run:
-- 1) In Supabase Dashboard -> SQL Editor, paste this whole file and run.
-- 2) Or psql with service role: psql "<connection>" -f reset-and-seed-full.sql
-- After seeding, the app can log in with username: admin, PIN: 1234
-- and you’ll have full graph and price data for testing.
