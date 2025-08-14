/**
 * Trade Guide 核心类型定义
 * 与数据模型严格对应，确保类型安全
 */

export interface Product {
  id: string;       // 商品ID，如 "tea", "silk"
  name: string;     // 中文名称，如 "茗茶", "绢帛"
  weight: number;   // 单件重量，用于载重计算
}

export interface City {
  id: string;                              // 城市ID，如 "city_001"
  name: string;                            // 城市名称，古风中文
  buyableProductIds: [string, string, string]; // 固定3种可买商品
  createdBy: string;                       // 创建者用户ID
  createdAt: Date;                         // 创建时间
}

export interface User {
  id: string;          // 用户ID，等同用户名
  username: string;    // 用户名，2-16字符
  pinHash: string;     // PIN码哈希，bcrypt加密
  approved: boolean;   // 是否已审批
  isAdmin: boolean;    // 是否管理员
  failedAttempts: number;      // 失败尝试次数
  lockedUntil: Date | null;    // 锁定到期时间
  lastLoginAt: Date | null;    // 最后登录时间
  createdAt: Date;     // 创建时间
}

export interface PriceRecord {
  cityId: string;         // 城市ID
  productId: string;      // 商品ID
  buyPrice: number | null;   // 买入价，仅该城市可买商品时有值
  sellPrice: number | null;  // 卖出价，所有城市都可设置
  updatedAt: Date;        // 更新时间
  updatedBy: string;      // 更新者用户ID
}

export interface Edge {
  id: string;           // 边ID
  fromCityId: string;   // 起始城市
  toCityId: string;     // 目标城市
  distance: number;     // 距离，正整数
  createdBy: string;    // 创建者
  updatedAt: Date;      // 更新时间
}

export interface AuditLog {
  id: string;           // 审计记录ID
  userId: string;       // 操作用户
  action: AuditAction;  // 操作类型
  targetType: string;   // 目标类型
  targetId: string;     // 目标ID
  oldValue: any;        // 操作前值
  newValue: any;        // 操作后值
  description: string;  // 可读描述
  createdAt: Date;      // 操作时间
}

export type AuditAction = 
  | 'price_update'
  | 'city_products_update'
  | 'city_create'
  | 'city_update'
  | 'city_delete'
  | 'topology_update'
  | 'user_approve'
  | 'user_create'
  | 'login_attempt'
  | 'login_success'
  | 'login_failure';

// 计算相关类型
export interface TradePlan {
  productId: string;       // 商品ID
  fromCityId: string;      // 起始城市
  toCityId: string;        // 目标城市
  quantity: number;        // 数量
  unitProfit: number;      // 单件利润
  totalProfit: number;     // 总利润
  buyPrice: number;        // 买入价
  sellPrice: number;       // 卖出价
  distance: number;        // 距离
  profitPerStamina: number; // 利润/体力比
  profitPerWeight: number;  // 利润/重量比
  dataFreshnessSec: number; // 数据新鲜度(秒)
}

export interface ComputeParams {
  originCityId: string;     // 起始城市
  stamina: number;          // 当前体力
  maxWeight: number;        // 载重上限
}

// 价格数据索引结构
export type PriceMap = Map<string, Map<string, PriceRecord>>; // cityId -> productId -> PriceRecord

// 图数据结构
export interface GraphData {
  cities: City[];
  edges: Edge[];
  adjacencyList: Map<string, Array<{ cityId: string; distance: number }>>;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 表单验证相关
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// 组件prop类型
export interface PriceInputProps {
  cityId: string;
  readonly?: boolean;
  onSave?: (changes: Partial<PriceRecord>[]) => void;
}

export interface ComputeResultProps {
  plan: TradePlan | null;
  loading?: boolean;
  error?: string;
}

// 常量定义
export const CONSTRAINTS = {
  PIN_LENGTH: 4,
  MAX_FAILED_ATTEMPTS: 3,
  LOCKOUT_DURATION_MS: 5 * 60 * 1000, // 5分钟
  USERNAME_MIN_LENGTH: 2,
  USERNAME_MAX_LENGTH: 16,
  BUYABLE_PRODUCTS_COUNT: 3,
  PRICE_STALENESS_WARNING_MS: 60 * 60 * 1000, // 60分钟
  PRICE_STALENESS_ALERT_MS: 90 * 60 * 1000,   // 90分钟
  MAX_PRICE_VALUE: 9999999,
  ALGORITHM_TIMEOUT_MS: 20, // 算法计算超时
  TOTAL_RESPONSE_TIMEOUT_MS: 100, // 总响应超时
} as const;
