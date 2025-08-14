# Trade Guid| 规则 | 说明 |
|------|------|当前对外只有"普通使用者"这一体验，但系统内存在管理员用来：
- 审批注册请求
- 配置 / 修改城市拓扑（增删城市、修改距离）

普通用户可以：
- 录入商品价格
- 修改各城市的 3 种可买商品配置
- 查看自己的操作历史

使用者流程：输入用户名申请 → 等待管理员通过 → 之后每次只需输入用户名即可进入（本期不设密码，依赖熟人环境；可后续加简单 PIN）。市集合 C | 测试数据阶段初始 20 座城市，支持管理员动态添加/删除；所有城市都可以卖出全部 25 种商品（需录入卖价）。 |
| 商品集合 P | 固定 25 种中国古风商品；每种固定重量。 |
| 城市可买集合 | 每个城市只能买到 3 种特定商品；普通用户可修改城市商品A: 该城市不在 3 个 buyable 列表中，不允许买入录入。

---
## 18. 最小可行示例（伪交互）
1. 新用户输入用户名"墨客"→ 提交申请。
2. 管理员在审批页看到"墨客"→ 点击批准。
3. 墨客重新进入：进入系统，选择当前城市"洛水"。
4. 录入洛水 3 个可买商品的买价 + 全部 25 商品卖价（未知暂留空）。
5. 输入体力=30，载重=2000 → 计算 → 返回：买"白玉" 40 件，运往"长安"，距离 18，总利润 5200。
6. 墨客发现"洛水"的可买商品配置不合理，进入"商品配置"页面，将洛水的可买商品从[tea, porcelain, ink]改为[tea, jade, ink]。
7. 管理员可以在审计页面看到：墨客在某时间修改了洛水的商品配置，以及具体的变更内容。
8. 管理员需要新增城市"临沂"，在城市管理中添加新城市，并配置与其他城市的距离。

---集合允许有交集。 |
| 价格刷新 | 依靠玩家人工更新（建议 ≤1 小时一次），只要有变化即可立即覆盖。 |
| 体力 | 行走消耗 = 最短路距离 (整数)；不足则该城市不可达。 |
| 载重 W_max | 默认 2000（可编辑）。总重量 ≤ 载重。 |
| 策略输出 | 仅计算"一次、单一品种、单跳"方案：在当前城市买该品种最大可装数量 → 运到某个可达城市卖出。 |
| 录入义务 | 玩家需录入：本城 3 种买入价 + 全部 25 种卖出价；缺失视为未知。 |
| 用户审批 | 新用户名提交申请后需管理员审批；审批后用户名+4位PIN码登录。 |
| 拓扑管理 | 管理员可编辑城市拓扑（距离）、新增/删除城市。普通用户不能改拓扑。 |
| 商品配置 | 普通用户可修改每个城市的 3 种可买商品配置。 |
| 行为审计 | 记录所有数据修改操作，支持多维度查看（按用户、按城市商品、按价格变化）。 |计算工具)

> 手机端浏览器使用，极简：价格录入 + 单次单品最佳运输买卖计算。

---
## 1. 目标与价值
公会成员分布在游戏内各个城市，协作更新 25 种商品的价格。任一已审批的成员可快速：
1. 录入或校正所在城市 3 种“本城可买”商品的买入价 & 所有 25 种商品的卖出价（有义务保持新鲜）。
2. 输入自身：当前城市、体力、载重量 → 计算“单一品种的一次买-运-卖”最佳方案。

---
## 2. 规则抽象（更新后的核心）
| 规则 | 说明 |
|------|------|
| 城市集合 C | 测试数据阶段固定 20 座城市；所有城市都可以卖出全部 25 种商品（需录入卖价）。 |
| 商品集合 P | 固定 25 种中国古风商品；每种固定重量。 |
| 城市可买集合 | 每个城市只能买到 3 种特定商品；配置长期固定；不同城市 3 种集合允许有交集。 |
| 价格刷新 | 依靠玩家人工更新（建议 ≤1 小时一次），只要有变化即可立即覆盖。 |
| 体力 | 行走消耗 = 最短路距离 (整数)；不足则该城市不可达。 |
| 载重 W_max | 默认 2000（可编辑）。总重量 ≤ 载重。 |
| 策略输出 | 仅计算“一次、单一品种、单跳”方案：在当前城市买该品种最大可装数量 → 运到某个可达城市卖出。 |
| 录入义务 | 玩家需录入：本城 3 种买入价 + 全部 25 种卖出价；缺失视为未知。 |
| 用户审批 | 新用户名提交申请后需管理员审批；审批后输入用户名即可直接登录（免密码）。 |
| 管理 | 管理员可编辑城市拓扑（距离）。普通用户不能改拓扑。 |

---
## 3. 角色 & 使用场景（精简）
当前对外只有“普通使用者”这一体验，但系统内存在管理员用来：
- 审批注册请求
- 配置 / 修改城市拓扑

使用者流程：输入用户名申请 → 等待管理员通过 → 之后每次只需输入用户名即可进入（本期不设密码，依赖熟人环境；可后续加简单 PIN）。

---
## 4. 产品功能清单（仅保留最小集合）
### 4.1 MVP 功能
1. 用户名申请 + 管理员审批登录（免密码）。
2. 城市选择（当前城市保存本地）。
3. 价格录入：25 行商品；字段：名称 / 买价(仅本城可买 3 种可编辑) / 卖价(全部) / 更新时间 / 最近更新人。
4. 高亮本城 3 种可买商品（置顶）。
5. 一键计算：输入体力、载重 → 给出最佳单品单跳方案。
6. 结果展示：商品、数量、买价/卖价、单件利润、总利润、目的城市、距离、利润/体力。
7. 城市拓扑管理：管理员界面增删边 & 距离；新增/删除城市；前端实时拉取最新拓扑。
8. 城市商品配置：普通用户可修改每个城市的 3 种可买商品配置。
9. 用户行为审计：记录所有数据修改操作，支持按用户查看、按城市商品变化查看、按价格变化查看。
10. 最短路计算（若拓扑非完全图）。
11. 数据时间高亮：>60 分钟黄色、>90 分钟红色。

### 4.2 暂不实现（明确排除）
- 多跳 / 多品种 / 排行榜 / 推送 / 价格可信度评分 / 异常检测 / 历史回滚 / PWA 离线（可后续再加）。

---
## 5. 技术选型建议
| 层次 | 推荐 (优先选简单易部署) | 说明 |
|------|----------------------|------|
| 前端 | Vue 3 + Vite + TypeScript + Pinia | 轻量。|
| UI 库 | UnoCSS / Tailwind(裁剪) + 自定义组件 | 适配移动端、可快速迭代。|
| 后端 | Serverless 实时数据库（Supabase / Firebase Firestore） | 免运维 + 实时监听价格变更。|
| 鉴权 | Magic Link / 匿名 + 邀请码 | 降低门槛。|
| 部署 | 静态托管（Vercel / Netlify / Cloudflare Pages） | 一键持续部署。|
| 数据模型 | 见下 | 极简。|
| 算法 | Dijkstra + 单品利润枚举 | 极低复杂度。|
| 版本控制 | GitHub 私有仓库 | 审计变更。|
| 语言 | 全中文 UI, 英文内部类型名 | 统一。|
| 平台形态 | 响应式 Web + PWA（可“添加到桌面”） | 规避原生审核，满足手机端使用体验。|

> 为何不首发独立 App / 小程序：需审核 + 上架流程 + 维护成本高；PWA 已可离线缓存 + 桌面图标 + 全屏。

---
## 6. 数据模型 (逻辑层)
```ts
// 25 种商品（静态）
Product {
  id: string;         // eg. "gold"
  name: string;       // 显示名称
  weight: number;     // 单件重量
}

// 城市（动态可管理）
City {
  id: string;         // eg. "c01"
  name: string;
  buyableProductIds: [string, string, string]; // 固定 3 种，可与其他城市部分重合，普通用户可修改
  createdAt: timestamp;
  createdBy: userId;
}

// 城市间边 (若非完全图)
Edge { from: CityId; to: CityId; distance: number; }

// 价格记录（覆盖式最新）
PriceRecord {
  cityId: string;
  productId: string;
  buyPrice: number | null;   // 仅当该城市 buyable 才可编辑，否则始终 null
  sellPrice: number | null;  // 所有城市可编辑
  updatedAt: timestamp;
  updatedBy: userId;
}

// 用户（审批流）
User {
  id: string;        // = username（唯一）
  approved: boolean; // 管理员审批后 true
  isAdmin: boolean;  // 少量管理员
  createdAt: timestamp;
}

// 待审批（也可直接把 approved=false 的 User 当作待审批）
PendingAction { type: 'register'; username: string; createdAt: timestamp; }

//审计日志
AuditLog {
  id: string;
  userId: string;        // 操作人
  action: string;        // 'price_update', 'city_products_update', 'city_create', 'city_delete', 'topology_update'
  targetType: string;    // 'price', 'city_products', 'city', 'topology'
  targetId: string;      // 目标对象ID（如cityId, edgeId等）
  oldValue: any;         // 修改前的值
  newValue: any;         // 修改后的值
  description: string;   // 可读描述，如"修改长安-洛水距离从5改为6"
  createdAt: timestamp;
}

// 计算日志（可选，首版可不存）
CalcLog { userId: string; cityId: string; result: TradePlan | null; createdAt: timestamp; }

TradePlan {
  productId: string;
  fromCityId: string; toCityId: string; distance: number;
  quantity: number; unitProfit: number; totalProfit: number;
  buyPrice: number; sellPrice: number;
  profitPerStamina: number; profitPerWeight: number;
  dataFreshnessSec: number; // 价格时间差最大值
}
```

### 索引建议
- PriceRecord: (cityId, productId) 唯一。
- User: approved 索引（拉取待审批列表）。
- AuditLog: (userId, createdAt) 索引（按用户查看操作历史），(targetType, targetId, createdAt) 索引（按目标查看变化历史）。

### 实时监听（最小）
- 当前城市相关的 PriceRecord（cityId = 当前）
- 当前城市 3 种商品在所有城市的卖价（productId in buyableProductIds）

---
## 7. 算法设计（单次最佳单品计算）
### 输入
- 当前城市 S
- 当前体力 T (>=0)
- 当前载重 W_max
- 价格表 price[city][product] = {buyPrice, sellPrice}
- 商品重量 weight[p]
- 城市图 G(V,E) + 距离（非负整数）

### 输出
- 最优 TradePlan（或 null 若无正利润）

### 步骤（伪代码）
1. P_s ← S.buyableProductIds (3 个)
2. 预取所有 candidateCities = 所有城市（因为所有城市都能卖）。
3. 计算从 S 到全部城市最短距离 dist[] （Dijkstra；若城市数稳定，可全对全 Floyd 预计算并缓存）。
4. best ← null
5. For 每个 p ∈ P_s:
   a. b ← price[S][p].buyPrice (若 null 跳过)
   b. If 所有城市对 p 的 sellPrice 都为 null → continue
   c. q_max ← floor(W_max / weight[p]) (若=0跳过)
   d. For 每个城市 C:
       - dC ← dist[C]; 若 dC > T → continue
       - s ← price[C][p].sellPrice; 若 s==null 或 s ≤ b → continue
       - unitProfit = s - b
       - totalProfit = unitProfit * q_max
       - profitPerStamina = totalProfit / max(1, dC)
       - 按 (totalProfit, profitPerStamina, -dC) 排序准则更新 best
6. 返回 best

### 复杂度
- Dijkstra: O(E log V)
- 枚举最多 3 * V 次；V<= N (城市数) → O(V)
- 总体轻量（实时交互 < 数毫秒）。

### 边界与判定
| 情况 | 处理 |
|------|------|
| 无可买价 | 返回 null（提示“当前城市缺少买价”）。 |
| 所有卖价 ≤ 买价 | null（提示无正利润）。 |
| 体力不足到任意正利润城市 | null（提示体力不足）。 |
| 多方案利润相同 | 选择 profitPerStamina 高者；再选距离近者。 |
| 价格缺失 | 视为不可交易。 |
| 数值异常（极端高价） | UI 红框提示；仍可计算（可配置拦截）。 |

---
## 8. UI/UX 设计（精简移动端）
### 导航（底部 Tab）
1. 价格录入
2. 计算
3. 商品配置（普通用户）
4. 审批管理（仅管理员显示）
5. 我的

### 价格录入页
- 25 行：图标 / 名称 / 买价(仅当 buyable) / 卖价 / 更新时间(简写) / 更新人首字符。
- 顶部：当前城市选择 + “全部保存”按钮（有改动时高亮）。
- 本城 3 种置顶 + 特殊色块。

### 计算页
- 输入：体力、载重（记忆上次值）。
- 输出：方案卡（若无 → 原因提示）。

### 审批管理页（管理员）
- 待审批用户名列表：同意 / 拒绝。
- 城市管理：城市列表增删改（名称、ID）。
- 城市拓扑：边列表 (from, to, distance) 简单增删改。
- 行为审计：
  * 按用户查看：选择用户 → 查看其最近10天的所有修改记录
  * 按城市商品变化查看：选择城市 → 查看该城市可购买商品的历史配置变化
  * 按价格变化查看：选择城市+商品 → 查看该商品价格的历史修改记录

### 商品配置页（普通用户）
- 城市列表：每个城市显示当前 3 种可买商品
- 修改入口：点击城市 → 从 25 种商品中选择 3 种
- 保存确认：显示变更内容，确认后提交

### 我的页面
- 个人信息：用户名、角色、加入时间
- 我的操作记录：最近的价格录入、商品配置修改记录
- 统计信息：录入次数、贡献度等

### 交互细节
- 买价输入仅开放 3 行；其他显示“—”。
- 数值即时校验：必须为正整数 / 上限阈值(例如 9,999,999)。
- 更新时间以“距现在 mm 分”显示；阈值着色。

---
## 9. 数据一致性 & 并发（简化）
| 问题 | 策略 |
|------|------|
| 价格覆盖冲突 | 后写覆盖（熟人制度简化），可选添加 updatedAt 比较提示。 |
| 网络失败 | 本地暂存未提交更改（localStorage 队列），重试按钮。 |
| 时间来源 | 服务器时间戳写入 updatedAt。 |
| 异常值 | 限制范围 1..9,999,999，超出拒绝。 |

---
## 10. 安全与权限（最低可行）
| 功能 | 实现 |
|------|------|
| 登录 | 用户名 + 审批后方可进入，无密码。 |
| 管理员 | isAdmin=true 用户；仅其可审批 & 编辑拓扑。 |
| 价格写入 | 需已登录。 |
| 防滥用 | 前端限速：同一字段 2 秒内不重复发送。 |

---
## 11. 部署流程（示例：Vercel + Supabase）
1. Fork 仓库 / 私有化。
2. Supabase 创建项目 → 表结构迁移 (SQL).
3. 配置环境变量 (SUPABASE_URL, SUPABASE_ANON_KEY, GUILD_INVITE_CODE)。
4. Vercel 连接仓库 → 自动构建 (npm i & npm run build)。
5. 打开 PWA Manifest（图标、名称、自适应主题颜色）。

### 11.1 构建命令
- `dev`: 本地调试 (Hot Reload)
- `build`: 产出静态资源
- `preview`: 本地预览生产包

---
## 12. 质量保证（聚焦算法与稳定）
| 维度 | 措施 |
|------|------|
| 类型安全 | TypeScript strict。 |
| 单元测试 | 算法 5~8 个核心用例。 |
| 集成测试 | Mock：20 城 / 25 品 / 距离图。 |
| 性能 | Dijkstra 结果缓存；数据<=数百条无压力。 |
| 错误日志 | 控制台 + 可选简单 webhook。 |

---
## 13. 示例算法测试用例
| Case | 描述 | 期望 |
|------|------|------|
| 基本正利润 | 单一目的城市更高卖价 | 返回该城市方案 |
| 平局距离差 | 利润相同不同距离 | 选较近 |
| 体力不足 | dist > T | 过滤该城市 |
| 载重不足 | weight > W_max | 数量=0 -> 跳过 |
| 全非正利润 | sell<=buy | 返回 null |

---
## 14. 风险与缓解（当前范围）
| 风险 | 影响 | 缓解 |
|------|------|------|
| 价格滞后 | 决策失真 | 高亮时间超限，提示更新 |
| 恶意录入 | 价格错误 | 熟人 + 管理员可快速人工纠正 |
| 管理员缺席 | 新用户无法加入 | 设多个管理员 |
| 拓扑错误 | 路径不准 | 每次修改后广播刷新缓存 |

---
## 15. 架构模块（最小实现）
- `core/graph`: 城市与距离 + 最短路
- `core/pricing`: 价格 CRUD + 本地变更队列
- `core/strategy`: 单品单跳计算函数
- `core/city`: 城市管理 + 商品配置
- `core/audit`: 审计日志记录与查询
- `auth`: 用户申请 / 审批

---
## 16. 路线图 / TODO List（精简）

### Phase 0 数据准备 (Day 0-1)
- [ ] 确认 25 种商品及重量
- [ ] 确认 20 城市名称 (古风) 与 3 款可买商品映射（允许交集）
- [ ] 城市拓扑与距离（初始建议稀疏图）
- [ ] 生成 mock 价格 JSON
- [ ] 设计审计日志数据结构

### Phase 1 核心算法 (Day 1-2)
- [ ] TypeScript 接口定义
- [ ] Dijkstra 实现 + 缓存
- [ ] 单品最优计算函数 + 单元测试

### Phase 2 前端基础 (Day 2-4)
- [ ] Vite+Vue 项目骨架
- [ ] 路由 / Tab 布局
- [ ] 价格录入页面 (mock)
- [ ] 计算页面调用算法

### Phase 3 简易后端接入 (Day 4-6)
- [ ] 用户申请 / 审批接口
- [ ] 价格 CRUD 接口
- [ ] 城市拓扑 CRUD (管理员)
- [ ] 城市管理 CRUD（管理员）
- [ ] 城市商品配置 CRUD（普通用户）
- [ ] 审计日志接口（记录与查询）

### Phase 4 打磨 & 上线 (Day 6-7)
- [ ] 时间高亮 / 校验
- [ ] 部署 Vercel
- [ ] README 使用指引更新

### 持续
- [ ] 记录改动日志（若需要）
- [ ] 反馈收集

---
## 17. FAQ (更新)
Q: 为什么只算单一品种单次？
A: 满足当前最主要需求，复杂度低，上线快。

Q: 为什么免密码？
A: 熟人公会环境；管理员审批控制成员。可随时添加密码机制。

Q: 没有某城市某商品卖价？
A: 视为该城市不可卖该商品（跳过）。

Q: 买价为什么是 null？
A: 该城市不在 3 个 buyable 列表中，不允许买入录入。

---
## 18. 最小可行示例（伪交互）
1. 新用户输入用户名“墨客”→ 提交申请。
2. 管理员在审批页看到“墨客”→ 点击批准。
3. 墨客重新进入：进入系统，选择当前城市“洛水”。
4. 录入洛水 3 个可买商品的买价 + 全部 25 商品卖价（未知暂留空）。
5. 输入体力=30，载重=2000 → 计算 → 返回：买“白玉” 40 件，运往“长安”，距离 18，总利润 5200。

---
## 19. 测试数据（示例草案）

### 25 种商品（示例，含重量）
| id | 名称 | 重量 |
|----|------|------|
| tea | 茗茶 | 50 |
| silk | 绢帛 | 40 |
| porcelain | 瓷器 | 120 |
| jade | 白玉 | 50 |
| gold | 赤金 | 200 |
| iron | 精铁 | 180 |
| spice | 香料 | 30 |
| herb | 灵草 | 20 |
| lacquer | 漆器 | 90 |
| scroll | 书卷 | 25 |
| ink | 墨锭 | 35 |
| paper | 宣纸 | 15 |
| bamboo | 竹材 | 60 |
| tea_brick | 茶砖 | 70 |
| salt | 井盐 | 110 |
| fur | 兽皮 | 140 |
| horse | 骏马 | 400 |
| copper | 赤铜 | 160 |
| silver | 白银 | 180 |
| ceramic | 粗陶 | 100 |
| glass | 琉璃 | 130 |
| dye | 染料 | 55 |
| sugar | 红糖 | 80 |
| jadeite | 翠玉 | 55 |
| pearl | 南珠 | 45 |

### 20 座城市（示例名称）
长安, 洛水, 云州, 燕然, 临海, 建业, 江陵, 荆门, 广陵, 成都, 峨眉, 凉州, 沙州, 桂林, 扬州, 邺城, 晋阳, 会稽, 北海, 西陵

### 每城可买 3 种（示例映射节选）
```
长安: [gold, silk, jade]
洛水: [tea, porcelain, ink]
云州: [horse, fur, iron]
燕然: [iron, copper, salt]
临海: [salt, spice, sugar]
建业: [porcelain, lacquer, paper]
江陵: [herb, tea_brick, dye]
荆门: [scroll, ink, paper]
广陵: [silk, dye, lacquer]
成都: [herb, spice, jade]
峨眉: [tea, herb, jadeite]
凉州: [horse, fur, copper]
沙州: [spice, tea_brick, silk]
桂林: [bamboo, lacquer, sugar]
扬州: [silk, porcelain, paper]
邺城: [iron, copper, silver]
晋阳: [iron, jade, gold]
会稽: [tea, bamboo, paper]
北海: [salt, fish?(可再定), copper]  // TODO: 若无 fish 则替换为 glass
西陵: [glass, pearl, jadeite]
```
（可视需要再调优，确保覆盖度与一定交集。）

### 距离拓扑（示例：边列表片段）
```
长安-洛水: 5
长安-广陵: 12
洛水-建业: 9
建业-广陵: 4
广陵-扬州: 3
扬州-会稽: 7
长安-晋阳: 10
晋阳-邺城: 6
邺城-北海: 11
长安-凉州: 18
凉州-沙州: 8
沙州-峨眉: 14
峨眉-成都: 3
成都-桂林: 16
桂林-会稽: 15
...
```

> 实际将以 JSON 编写供前端直接加载。

### 示例初始价格（片段）
```
price[长安][gold]: { buy: 5200, sell: 5400 }
price[洛水][gold]: { buy: null, sell: 5550 }
price[广陵][silk]: { buy: 300, sell: 340 }
...
```

## 20. 许可证 (暂定)
- 初期私有；未来可视情况改为 MIT。

---
## 21. 免责声明
本工具为玩家社区协作数据工具，与游戏官方无关；所有数据由用户自行输入，仅供策略参考。

---
## 22. 下一步建议 (立即行动 48h 内)
- [ ] 敲定 20 种商品与权重
- [ ] 敲定城市数量与拓扑 & 三商品分配
- [ ] 录入 mock JSON（products.json, cities.json, distances.json, sample-prices.json）
- [ ] 实现算法模块 & 单测

> 完成以上后即可进行前端界面搭建。

---
**准备好后，可继续让我：生成初始项目结构 / Mock 数据 / 算法代码 / SQL 建表。**

---
## 23. 代码实现任务清单（可逐项勾选）

### 23.1 项目初始化
- [ ] 创建前端项目 (Vite + Vue3 + TypeScript)
- [ ] 配置路径别名 (@/)
- [ ] ESLint + Prettier + TypeScript strict
- [ ] Git Hooks (lint-staged + simple commit msg 模板，可选)
- [ ] 环境变量文件 (.env.example)

### 23.2 静态数据 & Mock
- [ ] products.json（25 品）
- [ ] cities.json（20 城 + buyableProductIds）
- [ ] distances.json（边列表/邻接表）
- [ ] mock-prices.json（初始示例）
- [ ] 数据加载模块 (core/dataLoader.ts)

### 23.3 类型与模型
- [ ] 定义接口 types/domain.ts (Product, City, PriceRecord, User, TradePlan)
- [ ] 常量/守卫函数 (isBuyableInCity)
- [ ] 价格索引结构 (Map<cityId, Map<productId, PriceRecord>>)

### 23.4 图与最短路模块
- [ ] 构建邻接表 buildGraph(cities, edges)
- [ ] Dijkstra(cityId) 返回 dist[]
- [ ] 缓存策略 (LRU / 简单 Map) + 失效（拓扑修改后清空）
- [ ] 单元测试：
  - [ ] 简单链路
  - [ ] 分支图
  - [ ] 不连通节点（返回 Infinity）

### 23.5 策略算法模块
- [ ] 计算函数 computeBestSingleHop(params)
- [ ] 边界处理（体力不足 / 无买价 / 无正利润）
- [ ] 排序准则实现（利润→利润/体力→距离）
- [ ] 单元测试：5+ 场景

### 23.6 本地状态管理
- [ ] Pinia store: userStore（username, approved, isAdmin）
- [ ] Pinia store: cityStore（currentCityId）
- [ ] Pinia store: priceStore（价格 Map + 更新方法 + 脏状态）
- [ ] Pinia store: graphStore（edges, version, rebuildDistCache）
- [ ] 本地持久化（localStorage：username, currentCityId, lastStamina, lastCapacity）

### 23.7 鉴权与审批（最简）
- [ ] 提交用户名申请 API (POST /register-request)
- [ ] 管理员审批 API (POST /approve)
- [ ] 获取待审批列表 API (GET /pending-users)
- [ ] 前端：申请表单组件
- [ ] 前端：审批页（列表 + 同意/拒绝按钮）
- [ ] 登录流程（输入用户名 → 查询 user → 状态判定）

### 23.8 价格录入模块
- [ ] PriceTable 组件（25 行）
- [ ] 行内区分买价/卖价编辑权限
- [ ] 脏行高亮
- [ ] 保存批处理(仅发送变更条目)
- [ ] 保存按钮 loading / 成功提示
- [ ] 更新时间相对格式化（<1m, Xm, >90m 红色）
- [ ] 价格修改审计日志记录

### 23.9 计算页
- [ ] 参数表单 (体力, 载重) + 校验
- [ ] 调用 computeBestSingleHop
- [ ] 结果卡组件（展示字段 + 复制按钮）
- [ ] 无结果空状态组件
- [ ] 最近一次结果缓存展示

### 23.10 管理员拓扑编辑
- [ ] EdgeList 组件（from, to, distance）
- [ ] 新增 / 删除 / 修改行
- [ ] 输入校验（distance>0）
- [ ] 保存触发拓扑版本递增
- [ ] 保存后清空最短路缓存
- [ ] 城市管理：城市列表 CRUD
- [ ] 拓扑修改审计日志记录

### 23.11 商品配置管理
- [ ] CityProductConfig 组件（城市列表 + 当前3种商品显示）
- [ ] 商品选择器（从25种中选3种）
- [ ] 配置修改确认对话框
- [ ] 保存城市商品配置
- [ ] 商品配置修改审计日志记录

### 23.12 行为审计系统
- [ ] AuditLog 数据模型
- [ ] 审计日志记录中间件
- [ ] 按用户查看操作历史组件
- [ ] 按城市商品变化查看组件  
- [ ] 按价格变化查看组件
- [ ] 审计日志分页与筛选
- [ ] 审计数据可视化（时间线）

### 23.13 我的页面
- [ ] 个人信息展示
- [ ] 个人操作历史列表
- [ ] 贡献度统计
- [ ] 操作次数统计图表

### 23.14 API / 数据访问层（若使用 Supabase 举例）
- [ ] supabaseClient.ts 初始化
- [ ] priceService.ts （listByCity, listForProducts, upsertMany）
- [ ] userService.ts （apply, approve, getByName）
- [ ] graphService.ts （getEdges, saveEdges）
- [ ] cityService.ts （list, create, update, delete）
- [ ] auditService.ts （create, listByUser, listByTarget）
- [ ] 统一错误封装（AppError）

### 23.15 实时/刷新策略（可选最简轮询）
- [ ] 轮询价格（当前城市 & 当前 3 商品相关卖价，间隔 60s）
- [ ] 轮询拓扑（间隔 5min 或手动刷新）
- [ ] 轮询城市商品配置（间隔 5min 或手动刷新）
- [ ] 取消 / 清理定时器 hooks

### 23.16 公用组件
- [ ] LoadingSpinner
- [ ] RelativeTimeLabel
- [ ] NumberInput（限制正整数）
- [ ] ConfirmDialog（管理员操作）
- [ ] ProductSelector（商品多选组件）
- [ ] AuditLogViewer（审计日志查看器）

### 23.17 表单与校验
- [ ] 简单 util: parsePositiveInt / clamp
- [ ] 错误提示气泡 / 下方消息
- [ ] 城市名称校验
- [ ] 商品配置校验（必须选择3个）

### 23.18 错误与通知
- [ ] 全局消息（成功/失败）
- [ ] 网络错误分类（超时 / 权限 / 其它）
- [ ] 操作成功通知（价格更新、配置修改等）

### 23.19 单元测试 (Vitest)
- [ ] graph.spec.ts
- [ ] strategy.spec.ts
- [ ] validators.spec.ts
- [ ] audit.spec.ts

### 23.20 构建与部署
- [ ] package.json scripts (dev/build/preview/test)
- [ ] CI: push → lint + test + build
- [ ] Vercel 项目配置（环境变量）

### 23.21 性能与优化（视需要）
- [ ] 价格表虚拟滚动（若溢出）
- [ ] 图/价格请求合并去抖
- [ ] 审计日志分页加载
- [ ] 打包分析（rollup-plugin-visualizer）

### 23.22 安全/健壮性
- [ ] 用户名过滤（长度 2-16 / 允许字符）
- [ ] API 返回处理空字段
- [ ] 防止重复提交（按钮禁用）
- [ ] 权限校验（商品配置、审计查看权限）

### 23.23 文档与可维护
- [ ] CONTRIBUTING.md（最简）
- [ ] scripts/seed.ts（插入 mock 数据）
- [ ] 更新 README：部署步骤截图（后续）
- [ ] API文档（审计日志接口）

### 23.24 清理 / 发布前检查
- [ ] 未使用依赖清理
- [ ] SourceMap 设置
- [ ] 404 / fallback 路由
- [ ] Lighthouse 移动端评分 > 90（性能）

### 23.25 可选延后项（标记，不在首版内）
- [ ] PWA Manifest + Service Worker
- [ ] 价格异常检测
- [ ] 历史价格与回滚
- [ ] 多语言 i18n
- [ ] 审计数据导出功能
- [ ] 高级统计分析（用户活跃度、价格趋势等）

> 建议在仓库创建 issues 并以以上分组拆分。
