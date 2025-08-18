-- Trade Guide demo seed: 20 products, 10 cities, edges, and prices (idempotent)
-- Run in your DB (Supabase SQL Editor or psql). Safe to re-run.

-- 1) Products catalog (20)
WITH src(name, weight, base_price) AS (
  VALUES
    ('丝绸', 15, 700),
    ('茶叶', 5, 120),
    ('瓷器', 25, 550),
    ('香料', 3, 320),
    ('铁器', 40, 400),
    ('盐', 10, 80),
    ('糖', 8, 90),
    ('酒', 12, 180),
    ('书籍', 7, 160),
    ('纸张', 6, 110),
    ('玉器', 20, 800),
    ('漆器', 18, 520),
    ('香木', 30, 450),
    ('金', 50, 950),
    ('银', 45, 700),
    ('铜', 35, 380),
    ('马匹', 80, 1000),
    ('皮革', 22, 260),
    ('陶器', 16, 140),
    ('染料', 9, 240)
)
INSERT INTO products(name, weight)
SELECT s.name, s.weight
FROM src s
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING id, name
;

-- Ensure all products exist and collect their ids with base prices
WITH prod_src(name, weight, base_price) AS (
  VALUES
    ('丝绸', 15, 700),
    ('茶叶', 5, 120),
    ('瓷器', 25, 550),
    ('香料', 3, 320),
    ('铁器', 40, 400),
    ('盐', 10, 80),
    ('糖', 8, 90),
    ('酒', 12, 180),
    ('书籍', 7, 160),
    ('纸张', 6, 110),
    ('玉器', 20, 800),
    ('漆器', 18, 520),
    ('香木', 30, 450),
    ('金', 50, 950),
    ('银', 45, 700),
    ('铜', 35, 380),
    ('马匹', 80, 1000),
    ('皮革', 22, 260),
    ('陶器', 16, 140),
    ('染料', 9, 240)
), p AS (
  SELECT pr.id, pr.name, ps.base_price
  FROM products pr
  JOIN prod_src ps ON ps.name = pr.name
)
-- 2) Cities (10)
, city_src(name, factor) AS (
  VALUES
    ('长安',  -40),
    ('洛阳',  -20),
    ('建康',  +10),
    ('成都',  +30),
    ('广州',  +50),
    ('杭州',  +20),
    ('开封',  -10),
    ('苏州',  +15),
    ('泉州',  +35),
    ('邯郸',  -30)
)
INSERT INTO cities(name, buyable_product_ids)
SELECT cs.name, ARRAY['','','']::text[] FROM city_src cs
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
RETURNING id, name
;

-- 3) Assign 3 buyable products per city (by name -> id::text)
-- City → three product names
WITH assign(city_name, p1, p2, p3) AS (
  VALUES
    ('长安', '丝绸', '茶叶', '铜'),
    ('洛阳', '瓷器', '盐', '皮革'),
    ('建康', '漆器', '纸张', '染料'),
    ('成都', '香料', '酒', '陶器'),
    ('广州', '香木', '金', '银'),
    ('杭州', '书籍', '丝绸', '瓷器'),
    ('开封', '盐', '糖', '纸张'),
    ('苏州', '玉器', '漆器', '丝绸'),
    ('泉州', '茶叶', '香料', '皮革'),
    ('邯郸', '铁器', '铜', '马匹')
)
UPDATE cities c
SET buyable_product_ids = (
  SELECT ARRAY[
    COALESCE((SELECT id::text FROM products WHERE name = a.p1), ''),
    COALESCE((SELECT id::text FROM products WHERE name = a.p2), ''),
    COALESCE((SELECT id::text FROM products WHERE name = a.p3), '')
  ]::text[]
)
FROM assign a
WHERE c.name = a.city_name
;

-- 4) Edges (bidirectional, distance 1–6)
-- Define pairs once; we insert both directions
WITH pairs(a, b, d) AS (
  VALUES
    ('长安','洛阳',2),
    ('长安','开封',3),
    ('洛阳','开封',2),
    ('开封','杭州',4),
    ('杭州','苏州',1),
    ('苏州','建康',2),
    ('建康','成都',5),
    ('成都','广州',6),
    ('广州','泉州',3),
    ('泉州','杭州',4),
    ('邯郸','洛阳',3),
    ('邯郸','长安',4)
), cid AS (
  SELECT c.name, c.id FROM cities c
), edges_src AS (
  SELECT ca.id AS from_id, cb.id AS to_id, p.d
  FROM pairs p
  JOIN cid ca ON ca.name = p.a
  JOIN cid cb ON cb.name = p.b
  UNION ALL
  SELECT cb.id, ca.id, p.d FROM pairs p
  JOIN cid ca ON ca.name = p.a
  JOIN cid cb ON cb.name = p.b
)
INSERT INTO edges(from_city_id, to_city_id, distance)
SELECT e.from_id, e.to_id, e.d
FROM edges_src e
ON CONFLICT (from_city_id, to_city_id) DO UPDATE SET distance = EXCLUDED.distance
;

-- 5) Prices (buy/sell 50–1000). Compute from product base +/- city factor.
-- For products NOT buyable in the city, buy_price = NULL. sell_price always present.
WITH cf AS (
  SELECT c.id, c.name, cs.factor, c.buyable_product_ids
  FROM cities c
  JOIN (
    VALUES
      ('长安',  -40),('洛阳',-20),('建康', 10),('成都',30),('广州',50),
      ('杭州',   20),('开封', -10),('苏州',15),('泉州',35),('邯郸',-30)
  ) AS cs(name, factor) ON cs.name = c.name
), pb AS (
  SELECT p.id, p.name, ps.base_price
  FROM products p
  JOIN (
    VALUES
      ('丝绸',700),('茶叶',120),('瓷器',550),('香料',320),('铁器',400),
      ('盐',80),('糖',90),('酒',180),('书籍',160),('纸张',110),
      ('玉器',800),('漆器',520),('香木',450),('金',950),('银',700),
      ('铜',380),('马匹',1000),('皮革',260),('陶器',140),('染料',240)
  ) AS ps(name, base_price) ON ps.name = p.name
), combo AS (
  SELECT cf.id AS city_id,
         pb.id AS product_id,
         GREATEST(50, LEAST(1000, pb.base_price + cf.factor)) AS base
  FROM cf CROSS JOIN pb
)
INSERT INTO price_records(city_id, product_id, buy_price, sell_price, updated_at, updated_by)
SELECT
  combo.city_id,
  combo.product_id,
  CASE WHEN (
         SELECT EXISTS (
           SELECT 1 FROM cf
           WHERE cf.id = combo.city_id
             AND combo.product_id::text = ANY(cf.buyable_product_ids)
             AND '' != ALL(cf.buyable_product_ids)
         )
       )
       THEN combo.base - 40 ELSE NULL END AS buy_price,
  combo.base + 30 AS sell_price,
  now(),
  'admin'
FROM combo
ON CONFLICT (city_id, product_id) DO UPDATE
  SET buy_price = EXCLUDED.buy_price,
      sell_price = EXCLUDED.sell_price,
      updated_at = now(),
      updated_by = EXCLUDED.updated_by
;

-- Done
