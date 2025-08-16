-- Seed coherent sample prices for quick demo of computeBestDirectTrip
-- Safe to run multiple times (uses ON CONFLICT upsert and preserves existing non-null values)

-- Note: Only direct neighbors are used for sell destinations to ensure feasibility under default stamina (20)

-- 1) Upsert BUY prices (one row per (city, product))
INSERT INTO price_records (city_id, product_id, buy_price, sell_price, updated_by)
VALUES
  -- chang_an (buy: silk/jade/gold)
  ('chang_an','silk',100,NULL,'admin'),
  ('chang_an','jade',200,NULL,'admin'),
  ('chang_an','gold',500,NULL,'admin'),

  -- luo_shui (buy: tea/porcelain/ink)
  ('luo_shui','tea',30,NULL,'admin'),
  ('luo_shui','porcelain',80,NULL,'admin'),
  ('luo_shui','ink',20,NULL,'admin'),

  -- jian_ye (buy: porcelain/lacquer/paper)
  ('jian_ye','porcelain',70,NULL,'admin'),
  ('jian_ye','lacquer',60,NULL,'admin'),
  ('jian_ye','paper',10,NULL,'admin'),

  -- guang_ling (buy: silk/dye/lacquer)
  ('guang_ling','silk',120,NULL,'admin'),
  ('guang_ling','dye',40,NULL,'admin'),
  ('guang_ling','lacquer',50,NULL,'admin'),

  -- jin_yang (buy: iron/jade/gold)
  ('jin_yang','iron',100,NULL,'admin'),
  ('jin_yang','jade',220,NULL,'admin'),
  ('jin_yang','gold',520,NULL,'admin')
ON CONFLICT (city_id, product_id)
DO UPDATE SET
  buy_price = COALESCE(EXCLUDED.buy_price, price_records.buy_price),
  updated_at = NOW(),
  updated_by = COALESCE(EXCLUDED.updated_by, price_records.updated_by);

-- 2) Upsert SELL prices (ensure keys do not duplicate within this statement)
INSERT INTO price_records (city_id, product_id, buy_price, sell_price, updated_by)
VALUES
  -- Destinations for chang_an buys (neighbors: luo_shui, guang_ling, jin_yang)
  ('guang_ling','silk',NULL,160,'admin'),
  ('luo_shui','jade',NULL,260,'admin'),
  ('jin_yang','gold',NULL,620,'admin'),

  -- Destinations for luo_shui buys (neighbors: jian_ye, jin_yang)
  ('jian_ye','tea',NULL,45,'admin'),
  ('jin_yang','porcelain',NULL,110,'admin'),
  ('jian_ye','ink',NULL,30,'admin'),

  -- Destinations for jian_ye buys (neighbors: guang_ling, yang_zhou)
  ('guang_ling','porcelain',NULL,95,'admin'),
  ('yang_zhou','lacquer',NULL,85,'admin'),
  ('yang_zhou','paper',NULL,18,'admin'),

  -- Destinations for guang_ling buys (neighbor: yang_zhou)
  ('yang_zhou','dye',NULL,65,'admin'),
  ('yang_zhou','silk',NULL,160,'admin'),
  -- removed duplicate lacquer row to avoid ON CONFLICT affecting same row twice

  -- Destinations for jin_yang buys (neighbors: ye_cheng, chang_an)
  ('ye_cheng','iron',NULL,130,'admin'),
  ('chang_an','jade',NULL,260,'admin'),
  ('chang_an','gold',NULL,600,'admin')
ON CONFLICT (city_id, product_id)
DO UPDATE SET
  sell_price = COALESCE(EXCLUDED.sell_price, price_records.sell_price),
  updated_at = NOW(),
  updated_by = COALESCE(EXCLUDED.updated_by, price_records.updated_by);

-- Optional: price_records.updated_at is updated above for staleness indicator
