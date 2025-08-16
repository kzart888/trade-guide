-- Trade Guide 数据库初始化脚本
-- 适用于 Supabase PostgreSQL
-- 执行前请确保已创建 Supabase 项目

-- 说明：在 Supabase 托管环境下无需、也无权限设置 app.jwt_secret（由平台托管），
-- 如手动设置会报错 42501 permission denied。故此处不再设置。

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, -- 使用用户名作为主键
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT, -- bcrypt 哈希值
  approved BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 商品表（基础数据）
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weight INTEGER NOT NULL CHECK (weight > 0)
);

-- 城市表
CREATE TABLE IF NOT EXISTS cities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  buyable_product_ids TEXT[] NOT NULL CHECK (array_length(buyable_product_ids, 1) = 3),
  created_by TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 价格记录表
CREATE TABLE IF NOT EXISTS price_records (
  city_id TEXT REFERENCES cities(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
  buy_price INTEGER CHECK (buy_price > 0),
  sell_price INTEGER CHECK (sell_price > 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT REFERENCES users(id),
  PRIMARY KEY (city_id, product_id)
);

-- 城市连接表（拓扑）
CREATE TABLE IF NOT EXISTS edges (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  from_city_id TEXT REFERENCES cities(id) ON DELETE CASCADE,
  to_city_id TEXT REFERENCES cities(id) ON DELETE CASCADE,
  distance INTEGER NOT NULL CHECK (distance > 0),
  created_by TEXT REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (from_city_id, to_city_id)
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_approved ON users(approved);
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until);
CREATE INDEX IF NOT EXISTS idx_price_records_updated_at ON price_records(updated_at);
CREATE INDEX IF NOT EXISTS idx_edges_from_city ON edges(from_city_id);
CREATE INDEX IF NOT EXISTS idx_edges_to_city ON edges(to_city_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, created_at);

-- RLS 策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 用户表策略
CREATE POLICY "用户可以查看已审批的用户信息" ON users FOR SELECT 
  USING (approved = true);

CREATE POLICY "管理员可以管理用户" ON users FOR ALL 
  USING (auth.jwt() ->> 'is_admin' = 'true');

CREATE POLICY "用户可以更新自己的信息" ON users FOR UPDATE 
  USING (id = auth.jwt() ->> 'sub');

-- 城市表策略  
CREATE POLICY "所有已认证用户可以查看城市" ON cities FOR SELECT
  USING (auth.jwt() ->> 'approved' = 'true');

CREATE POLICY "管理员可以管理城市" ON cities FOR ALL
  USING (auth.jwt() ->> 'is_admin' = 'true');

-- 价格记录策略
CREATE POLICY "已认证用户可以查看价格" ON price_records FOR SELECT
  USING (auth.jwt() ->> 'approved' = 'true');

CREATE POLICY "已认证用户可以更新价格" ON price_records FOR INSERT
  WITH CHECK (auth.jwt() ->> 'approved' = 'true');

CREATE POLICY "用户可以更新价格" ON price_records FOR UPDATE
  USING (auth.jwt() ->> 'approved' = 'true');

-- 边表策略
CREATE POLICY "已认证用户可以查看拓扑" ON edges FOR SELECT
  USING (auth.jwt() ->> 'approved' = 'true');

CREATE POLICY "管理员可以管理拓扑" ON edges FOR ALL
  USING (auth.jwt() ->> 'is_admin' = 'true');

-- 审计日志策略
CREATE POLICY "用户可以查看自己的审计日志" ON audit_logs FOR SELECT
  USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "管理员可以查看所有审计日志" ON audit_logs FOR SELECT
  USING (auth.jwt() ->> 'is_admin' = 'true');

CREATE POLICY "系统可以创建审计日志" ON audit_logs FOR INSERT
  WITH CHECK (true);

-- 创建默认管理员用户
INSERT INTO users (id, username, pin_hash, approved, is_admin)
VALUES (
  'admin', 
  'admin',
  '$2a$10$F9yNecDCbJsacz8/HYgccO1eY6mvdlnqWnciIErU8TS4ve4bS6fOe', -- '1234' 的 bcrypt 哈希
  true,
  true
) ON CONFLICT (id) DO NOTHING;

-- 插入基础产品数据（25种商品）
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
('pearl', '南珠', 45)
ON CONFLICT (id) DO NOTHING;

-- 插入基础城市数据（20座城市）
INSERT INTO cities (id, name, buyable_product_ids, created_by) VALUES
('chang_an', '长安', ARRAY['gold', 'silk', 'jade'], 'admin'),
('luo_shui', '洛水', ARRAY['tea', 'porcelain', 'ink'], 'admin'),
('yun_zhou', '云州', ARRAY['horse', 'fur', 'iron'], 'admin'),
('yan_ran', '燕然', ARRAY['iron', 'copper', 'salt'], 'admin'),
('lin_hai', '临海', ARRAY['salt', 'spice', 'sugar'], 'admin'),
('jian_ye', '建业', ARRAY['porcelain', 'lacquer', 'paper'], 'admin'),
('jiang_ling', '江陵', ARRAY['herb', 'tea_brick', 'dye'], 'admin'),
('jing_men', '荆门', ARRAY['scroll', 'ink', 'paper'], 'admin'),
('guang_ling', '广陵', ARRAY['silk', 'dye', 'lacquer'], 'admin'),
('cheng_du', '成都', ARRAY['herb', 'spice', 'jade'], 'admin'),
('e_mei', '峨眉', ARRAY['tea', 'herb', 'jadeite'], 'admin'),
('liang_zhou', '凉州', ARRAY['horse', 'fur', 'copper'], 'admin'),
('sha_zhou', '沙州', ARRAY['spice', 'tea_brick', 'silk'], 'admin'),
('gui_lin', '桂林', ARRAY['bamboo', 'lacquer', 'sugar'], 'admin'),
('yang_zhou', '扬州', ARRAY['silk', 'porcelain', 'paper'], 'admin'),
('ye_cheng', '邺城', ARRAY['iron', 'copper', 'silver'], 'admin'),
('jin_yang', '晋阳', ARRAY['iron', 'jade', 'gold'], 'admin'),
('hui_ji', '会稽', ARRAY['tea', 'bamboo', 'paper'], 'admin'),
('bei_hai', '北海', ARRAY['salt', 'glass', 'copper'], 'admin'),
('xi_ling', '西陵', ARRAY['glass', 'pearl', 'jadeite'], 'admin')
ON CONFLICT (id) DO NOTHING;

-- 插入基础拓扑数据（城市连接）
INSERT INTO edges (from_city_id, to_city_id, distance, created_by) VALUES
('chang_an', 'luo_shui', 5, 'admin'),
('chang_an', 'guang_ling', 12, 'admin'),
('chang_an', 'jin_yang', 10, 'admin'),
('chang_an', 'liang_zhou', 18, 'admin'),
('luo_shui', 'jian_ye', 9, 'admin'),
('luo_shui', 'jin_yang', 8, 'admin'),
('jian_ye', 'guang_ling', 4, 'admin'),
('jian_ye', 'yang_zhou', 6, 'admin'),
('guang_ling', 'yang_zhou', 3, 'admin'),
('yang_zhou', 'hui_ji', 7, 'admin'),
('jin_yang', 'ye_cheng', 6, 'admin'),
('ye_cheng', 'bei_hai', 11, 'admin'),
('liang_zhou', 'sha_zhou', 8, 'admin'),
('sha_zhou', 'e_mei', 14, 'admin'),
('e_mei', 'cheng_du', 3, 'admin'),
('cheng_du', 'gui_lin', 16, 'admin'),
('gui_lin', 'hui_ji', 15, 'admin'),
('jiang_ling', 'jing_men', 4, 'admin'),
('jing_men', 'guang_ling', 8, 'admin'),
('yun_zhou', 'yan_ran', 7, 'admin'),
('yan_ran', 'ye_cheng', 9, 'admin'),
('lin_hai', 'xi_ling', 12, 'admin'),
('xi_ling', 'hui_ji', 10, 'admin'),
('bei_hai', 'lin_hai', 15, 'admin')
ON CONFLICT (from_city_id, to_city_id) DO NOTHING;

-- 创建双向边（无向图）
INSERT INTO edges (from_city_id, to_city_id, distance, created_by)
SELECT to_city_id, from_city_id, distance, created_by 
FROM edges
WHERE NOT EXISTS (
  SELECT 1 FROM edges e2 
  WHERE e2.from_city_id = edges.to_city_id 
    AND e2.to_city_id = edges.from_city_id
);

COMMIT;
