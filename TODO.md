# Trade Guide 任务清单

> **使用说明**: 每完成一个任务请勾选 `[x]`，这是我们的开发进度追踪表

## 📋 Phase 0: 数据准备 (Day 0-1)

- [x] 确认 25 种商品及重量
- [x] 确认 20 城市名称 (古风) 与 3 款可买商品初始映射（允许交集，可后续动态调整）
- [x] 初始城市拓扑（直接连接边集合 + 距离）
- [x] 生成 mock 价格 JSON  
- [x] 设计审计日志数据结构
- [x] PIN码验证逻辑设计（4位数字）
- [x] 创建TypeScript类型定义

## 🧮 Phase 1: 核心算法 (Day 1-2)

- [x] TypeScript 接口定义
- [x] 直接相邻枚举单次最优计算函数 + 单元测试
- [x] PIN码加密存储与验证算法
- [x] 算法性能测试（目标 < 100ms）

## 🎨 Phase 2: 前端基础 (Day 2-4)

### 项目初始化
- [x] Vite+Vue3+TypeScript 项目骨架
- [x] ESLint + Prettier + 路径别名配置
- [x] UnoCSS 配置与基础样式
- [x] Pinia 状态管理设置
 - [x] 集中 Mock 数据（src/mocks/seed.ts）

- [x] 用户登录组件（用户名 + PIN码输入）
	- [x] 登录页面 `/login` + 基础校验
	- [x] 路由守卫：未登录跳转登录页
	- [x] PIN 输入 UX（自动前进/回退/粘贴，数字键盘）
- [x] 计算页面 (参数输入 + 结果展示最小可运行)
 - [x] 价格录入页置顶本城3可买商品
- [x] userStore（username, approved, isAdmin, loggingIn, error）
- [x] cityStore（currentCityId, cities, products config）
 - [x] 价格保存反馈（保存中/成功/失败 + 重试）
- [x] graphStore（edges 缓存；无需最短路缓存，仅直接边查询）
- [ ] 用户登录组件 (用户名 + PIN码输入)
	- [x] 登录页面 `/login` + 基础校验
	- [x] 路由守卫：未登录跳转登录页

- [ ] Supabase 项目创建
 - [x] supabaseClient.ts 初始化（环境变量占位）
- [x] 用户表 (User) 创建（见 database/init.sql）
- [x] 价格表 (PriceRecord) 创建  
- [x] 审计表 (AuditLog) 创建
- [x] 城市表 (City) 创建
- [x] 边表 (Edge) 创建
- [x] RLS 权限策略配置（基于 approved/is_admin 声明）
### 数据库设计
- [ ] Supabase 项目创建
 - [x] supabaseClient.ts 初始化（环境变量占位）
- [ ] userService.ts （注册、审批、PIN验证）
	- [x] login（PIN 验证 + 锁定策略 + 审计；Mock: PIN=1234）
	- [ ] register（提交申请，待审批）
	- [ ] approve/reject（管理员）
- [ ] 审计表 (AuditLog) 创建
- [ ] 城市表 (City) 创建
- [x] cityService.ts （城市管理 + 商品配置）
- [ ] RLS 权限策略配置

### API服务层
- [ ] graphService.ts （拓扑管理：城市增改名、边增改、距离修改）
- [ ] userService.ts （注册、审批、PIN验证）
	- [x] login（PIN 验证 + 锁定策略 + 审计；Mock: PIN=1234）
- [ ] productService.ts （商品增删与改名，更新受影响城市配置）
	- [x] fetchMap（读取价格 Map + 最近更新时间）
- [ ] cityService.ts （城市管理 + 商品配置）
	- [x] updateBuyables（更新 buyable_product_ids + 审计）
- [ ] 用户注册申请流程（后端开启后）
- [ ] PIN码设置与验证（注册与重置流程）
- [ ] 管理员审批界面（最小可用：列表 + 审批/拒绝）
- [x] 价格录入与保存
	- [x] listEdges（读取边）
- [x] 城市商品配置修改
- [x] 审计日志记录（查看界面待做）
- [ ] 审计日志查看（筛选/分页）
- [ ] 拓扑编辑（管理员：城市增删改名 / 边增删改 / 距离修改 / 商品增删改名）
### 功能集成
- [ ] 用户注册申请流程
- [ ] PIN码设置与验证
- [ ] 管理员审批界面
- [ ] 价格录入与保存
	- [x] 价格查询（从服务读取，支持 Supabase/Mock）
- [ ] 城市商品配置修改
- [ ] 审计日志记录与查看
- [ ] 拓扑编辑（管理员：城市增删改名 / 边增删改 / 距离修改 / 商品增删改名）

## 🚀 Phase 4: 打磨上线 (Day 6-7)

### 用户体验优化
- [ ] 加载动画与状态指示
- [ ] 错误处理与用户提示
- [x] 数据时间高亮（>60分钟黄色、>90分钟红色）（Compute页）
- [ ] 移动端适配测试
 - [x] PIN码输入体验优化（数字键盘、自动提交、粘贴/退格）
 - [x] 全局 Toast 提示（成功/失败/信息）并集成 PriceEntry/CityConfig
 - [x] 价格保存成功/失败提示与重试（PriceEntry）

### 审计功能完善
- [x] PIN码安全存储（bcryptjs 验证工具 + 数据库哈希示例）
- [ ] 按城市商品变化查看组件  
- [ ] 按价格变化查看组件
- [ ] 审计数据分页与筛选
- [ ] 我的页面（个人信息 + 操作记录）
- [ ] Vercel 项目配置
- [ ] 环境变量设置（VITE_SUPABASE_URL、VITE_SUPABASE_ANON_KEY；未配置则 Demo 模式）
- [ ] 生产构建测试
- [ ] Lighthouse性能测试（目标>90分）
- [ ] PWA Manifest配置
- [ ] 域名绑定与SSL

#### 上线最小化路径（MVP 优先）
- [ ] 以 Demo 模式部署（无后端，功能：登录占位、价格录入本地态、计算与城市配置演示）
- [ ] 配置 Supabase 并执行 `database/init.sql`
- [ ] 在 Vercel 设置环境变量并重新部署（切换到真实后端）
- [ ] 线上冒烟：登录（admin/1234）、价格保存、城市配置修改、计算结果
- [ ] API访问频率限制

### 部署上线
- [ ] Vercel 项目配置
- [ ] 环境变量设置
- [ ] 生产构建测试
- [ ] Lighthouse性能测试（目标>90分）
- [ ] PWA Manifest配置
- [ ] 域名绑定与SSL

## 🧪 测试与文档

### 单元测试
- [x] computeBestDirectTrip.spec.ts (直接相邻枚举策略算法测试)
- [x] auth.spec.ts (PIN码验证测试)
- [ ] validators.spec.ts (输入验证测试)

### 集成测试  
- [ ] 用户注册登录流程
- [ ] 价格录入与查询流程
- [ ] 城市配置修改流程
- [ ] 审计日志记录流程

### 文档更新
- [ ] API接口文档（services 行为、错误码）
- [x] 部署指南更新（README 已含，另见 docs/deploy.md）
- [ ] 用户使用说明（移动端优先）
- [x] 开发环境搭建指南（README 已含）

## 📱 移动端优化

- [ ] 触摸手势优化
- [ ] 虚拟键盘适配
- [ ] PWA添加到桌面测试
- [ ] 离线缓存策略
- [ ] 网络断线重连处理

## 🔍 可选增强项 (优先级较低)

- [ ] 价格异常检测算法
- [ ] 数据导出功能  
- [ ] 高级统计分析
- [ ] 多语言支持准备
- [ ] 深色模式支持

## 📊 验收标准

### 功能完整性
- [ ] 所有5个页面正常工作
- [ ] 用户登录PIN码验证正常
- [ ] 价格录入与计算功能正常
- [ ] 管理员功能（审批、城市管理、审计）正常
- [ ] 普通用户功能（价格录入、商品配置）正常

### 性能指标
- [ ] 算法计算时间 < 100ms
- [ ] 页面加载时间 < 2s  
- [ ] Lighthouse移动端评分 > 90分

### 安全标准
- [ ] PIN码加密存储
- [ ] 用户权限隔离正确
- [ ] 审计日志记录完整
- [ ] 输入验证无漏洞

---

**进度跟踪**: 
- 总任务数: ~90+
- 已完成: ~55
- 进度: ~60%

**当前状态**: Phase 3 - 后端集成与部署准备

---

下一步（严格主线，不偏航）
1) 部署 Demo 版本到 Vercel（无后端）
2) 准备 Supabase 并执行初始化 SQL；设置 Vercel 环境变量
3) 实现最小管理员审批界面（仅列表已注册未审批用户 + 审批/拒绝按钮）
4) 补充文档：API 错误码与使用说明；补测 validators.spec
