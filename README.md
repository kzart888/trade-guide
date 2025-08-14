# Trade Guide (公会交易辅助与路线计算工具)

> 手机端浏览器使用，极简：价格录入 + 单次单品最佳运输买卖计算。

## 📖 文档导航

- **[AI助手指南](.github/copilot-instructions.md)**: 核心架构与开发导航 (AI优先参考)
- **[项目指南](PROJECT_GUIDE.md)**: 核心概念与快速定位 (人类阅读)
- **[开发路线图](ROADMAP.md)**: 整体开发计划与架构设计
- **[任务清单](TODO.md)**: 详细任务列表与进度跟踪
- **[数据模型](docs/data-models.md)**: 数据库设计与实体关系
- **[PIN认证](docs/pin-auth.md)**: 用户认证系统设计

## 🎯 核心功能

### 价格管理
- 25种中国古风商品价格录入
- 每城市3种可买商品配置（普通用户可修改）
- 实时价格更新与时间高亮提示

### 路线计算  
- 基于体力和载重约束：起点城市的 3 种可买商品 × 体力可达的直接相邻城市
- 不进行全图最短路；仅使用直接边距离
- 多维度优化排序（总利润 / 利润/体力 / 距离）

### 用户系统
- 用户名 + 4位PIN码登录
- 管理员审批制度
- 完整的操作行为审计

### 城市管理
- 20座古风城市及直接连接边
- 管理员可增删改城市、修改城市名称、增删改边与距离
- 城市与商品变更全局即时生效

## 🛠 技术栈

- **前端**: Vue 3 + Vite + TypeScript + Pinia + UnoCSS  
- **后端**: Supabase (Serverless数据库)
- **部署**: Vercel (静态托管) + PWA
- **算法**: 直接相邻边枚举 + 单品利润枚举（O(3 * 度(起点))）

## 📱 页面结构

1. **价格录入**: 25行商品价格表，本城可买商品置顶
2. **计算**: 输入体力载重 → 输出最佳交易方案  
3. **商品配置**: 城市列表 + 3种可买商品配置管理
4. **审批管理**: 用户审批 + 城市管理 + 行为审计 (管理员)
5. **我的**: 个人信息 + 操作历史 + 贡献统计

## 🚀 快速开始

### 开发环境
```bash
# 克隆项目
git clone <repo-url>
cd trade-guide

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 环境变量
```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔧 核心算法

### 单品最优计算（直接相邻枚举）
```typescript
function computeBestDirectTrip(params: {
  originCity: string;
  stamina: number;      // 体力：必须 ≥ 单条边距离
  maxWeight: number;    // 载重
  buyableProductIds: string[]; // 起点 3 种商品
  neighborEdges: { to: string; distance: number; }[]; // 直接相邻边
  prices: PriceMap;     // cityId->productId-> { buyPrice | sellPrice }
  products: Record<string,{ weight:number }>; // 商品重量
}): TradePlan | null
```

**步骤**:
1. 过滤 neighborEdges，distance <= stamina
2. 对 3 个 buyable 商品：若起点无买价则跳过
3. 计算装载数量 floor(maxWeight / weight)
4. 对每个可达城市取卖价，需 > 买价
5. 生成候选方案并按 (totalProfit, profitPerStamina, -distance) 排序取最优

**复杂度**: O(3 * 度(origin))

**不做**: 全图最短路缓存 / Floyd / 多跳组合

## 📊 数据结构

### 核心实体
```typescript
interface Product {
  id: string;
  name: string;
  weight: number;
}

interface City {  
  id: string;
  name: string;
  buyableProductIds: [string, string, string];
}

interface PriceRecord {
  cityId: string;
  productId: string;
  buyPrice: number | null;
  sellPrice: number | null;
  updatedAt: Date;
  updatedBy: string;
}

interface TradePlan {
  productId: string;
  fromCityId: string;
  toCityId: string;
  quantity: number;
  unitProfit: number;
  totalProfit: number;
  distance: number;
  profitPerStamina: number;
}
```

## 🔐 安全设计

### 认证机制
- 用户名注册 + 管理员审批
- 4位PIN码 + bcrypt加密存储
- 会话管理 + 自动过期

### 权限控制
- 管理员：审批用户、城市拓扑管理、全局审计
- 普通用户：价格录入、商品配置、个人审计

### 数据保护
- 输入验证与清洗
- SQL注入防护（Supabase RLS）
- 操作频率限制

## 📈 性能指标

- 算法计算时间: < 100ms
- 页面加载时间: < 2s  
- Lighthouse移动端评分: > 90分
- 支持用户数: 50+ (熟人环境)

## 🧪 测试策略

### 单元测试
- 图算法测试 (graph.spec.ts)
- 策略算法测试 (strategy.spec.ts)  
- PIN验证测试 (auth.spec.ts)

### 集成测试
- 完整用户流程测试
- API接口测试
- 前后端集成测试

## 📦 部署指南

### Supabase配置
1. 创建新项目
2. 执行数据库迁移SQL
3. 配置RLS安全策略
4. 获取连接凭证

### Vercel部署
1. 连接GitHub仓库
2. 设置环境变量
3. 配置构建命令：`npm run build`
4. 绑定自定义域名

## 🤝 贡献指南

1. Fork项目到个人账户
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交变更：`git commit -m 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 创建Pull Request

## 📄 许可证

私有项目，仅供内部使用。

## 📞 联系方式

项目维护者：[维护者信息]
问题反馈：[Issue链接]
