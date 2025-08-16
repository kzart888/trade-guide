# Deploy Guide (MVP)

This app runs in two modes:
- Demo mode: no backend; services fall back to in-memory mocks. Good for preview.
- Backend mode: connected to Supabase; reads/writes persist and audit logs are recorded.

## 1) Vercel (Demo mode)
1. Import the Git repo into Vercel.
2. Build command: default (Vite). No env vars set.
3. Deploy. You’ll see a demo banner in the app indicating no backend is configured.

## 2) Provision Supabase
1. Create a Supabase project.
2. In SQL Editor, run the contents of `database/init.sql`.
   - Creates tables, policies, seed data.
   - Admin user: username `admin`, PIN `1234` (bcrypt hash in SQL seed).

## 3) Connect app to Supabase
Set these env vars in Vercel Project Settings → Environment Variables:
- VITE_SUPABASE_URL = your Supabase project URL
- VITE_SUPABASE_ANON_KEY = your anon key

Redeploy. The app will automatically switch out of demo mode.

## 4) Smoke test (prod)
- Login with `admin` / `1234`.
- PriceEntry: edit a few prices and save; expect success toast.
- CityConfig: update 3 buyables; expect success toast.
- Compute: verify plan renders; staleness indicator visible.
- Admin: see pending users list when there are unapproved users.

## Notes
- If backend isn’t reachable or env vars missing, the app gracefully falls back to demo mode.
- RLS policies in `init.sql` assume JWT claims for admin/approved; for MVP, reads/writes that require elevated permissions should be performed via Admin user or service role as needed.
- For performance: target <100ms compute; price polling every 60s is enabled.

---

# 接入 Supabase（数据持久化，中文步骤）

以下步骤让线上版本从 Demo 模式切换为“可持久化”的后端模式。

1) 创建 Supabase 项目 → 执行初始化 SQL
- 打开 Supabase 控制台 → SQL Editor → 将仓库中的 `database/init.sql` 全部粘贴并运行
- 该脚本会创建：users/products/cities/edges/price_records/audit_logs 表与索引、RLS 策略、种子数据
- 种子里包含管理员账号：用户名 `admin`，PIN `1234`

2) 在 Vercel 配置环境变量并重新部署
- Vercel 项目 → Settings → Environment Variables：
   - VITE_SUPABASE_URL = 你的 Supabase 项目 URL
   - VITE_SUPABASE_ANON_KEY = 你的匿名密钥（anon key）
- 重新 Deploy（或 Redeploy）

3) 线上冒烟
- 使用 `admin/1234` 登录
- 价格录入：保存成功、刷新读取正常（顶部 60s 轮询会自动更新）
- 城市配置：修改 3 个可买商品并保存成功
- 审批页：当存在未审批用户时可见列表与审批按钮

注意：当前前端使用“用户名+PIN”方案，未启用 Supabase Auth。`init.sql` 里的 RLS 策略默认依赖 JWT Claims（approved/is_admin），如果前端未携带带有这些 claims 的 JWT，会导致受限操作失败。为快速上线（熟人环境、MVP），可临时放宽策略：

## 快速放宽策略（MVP，应急用，安全性较低）

在 Supabase SQL Editor 追加运行以下 SQL，使匿名角色（anon）可进行必要的读写。后续上线稳定后请按需收紧或迁移到更安全方案（如 Edge Functions + Service Role）。

```sql
-- 价格表：允许匿名读/写/改（持久化价格）
CREATE POLICY "anon select prices" ON price_records FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert prices" ON price_records FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update prices" ON price_records FOR UPDATE TO anon USING (true);

-- 商品与城市、拓扑：匿名可读；城市的 3 可买商品允许更新
CREATE POLICY "anon select products" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "anon select cities" ON cities FOR SELECT TO anon USING (true);
CREATE POLICY "anon update city buyables" ON cities FOR UPDATE TO anon USING (true);
CREATE POLICY "anon select edges" ON edges FOR SELECT TO anon USING (true);

-- 审计日志：插入策略在 init.sql 已放开（WITH CHECK (true)），可按需增加只读策略
CREATE POLICY "anon select audit" ON audit_logs FOR SELECT TO anon USING (true);

-- 登录依赖 users 表读取（会暴露 pin_hash，安全性较低，仅熟人环境临时使用）
CREATE POLICY "anon select users for login" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "anon update users lock counters" ON users FOR UPDATE TO anon USING (true);
```

风险提示：上述策略会让匿名用户对部分表有读写权限，适合私人/熟人内网或临时演示，不适合公开互联网上的大规模访问。若需提升安全：
- 方案 1：使用 Supabase Auth（邮箱/短信）登陆，后端通过 RLS 使用 auth.jwt() claims 做精细控制
- 方案 2：将“登录校验/价格保存/审批”等敏感操作封装为 Edge Functions（使用 service_role），前端仅调用函数，不直接操作表

## 本地开发（带后端）

1) 将 Supabase 的 URL 与 anon key 写入本地环境
```powershell
$env:VITE_SUPABASE_URL = "https://<your-project>.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "<your-anon-key>"
npm run dev
```

2) 或使用本地 Supabase（需 Docker + Supabase CLI）
```powershell
supabase start
# 启动后在 SQL Editor/psql 执行 database/init.sql
```

## 迁移到更安全方案（参考）

- 将登录改为“服务端校验 PIN”而不是把 pin_hash 下发到前端：
   - 新建 Postgres RPC 函数：入参 username、pin，服务端进行 bcrypt 校验与失败计数更新，返回（approved/is_admin）
   - 通过 RLS 限制仅允许调用该函数
- 价格/审批操作改为 Edge Functions（含审计），前端只传业务数据
- 收紧表级策略，仅保留必要的 SELECT 策略（产品/城市/拓扑）

## 常见报错排查

- ERROR: 42501: permission denied to set parameter "app.jwt_secret"
   - 原因：在 Supabase 托管环境中该参数由平台托管，普通角色无权设置
   - 处理：我们已移除 `database/init.sql` 中的该设置，直接重新执行剩余 SQL 即可
