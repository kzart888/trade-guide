# PIN码认证设计

## 设计原则

### PIN码规格
- **长度**: 4位数字 (0000-9999)
- **复杂度**: 简单数字，便于手机端输入
- **安全性**: bcrypt加密存储，符合行业标准

### 用户体验
- **输入方式**: 数字键盘，自动聚焦
- **视觉反馈**: 圆点显示，输入完成自动提交
- **错误处理**: 3次错误后临时锁定5分钟

## 实现细节

### 注册流程
1. 用户提交用户名申请
2. 管理员审批通过
3. 用户首次登录时设置4位PIN码
4. 系统使用bcrypt加密存储PIN码哈希值

### 登录流程  
1. 用户输入用户名
2. 系统验证用户是否已审批
3. 用户输入4位PIN码
4. 系统验证PIN码哈希匹配
5. 登录成功，创建会话

### 安全措施
```typescript
// PIN码加密存储
const bcrypt = require('bcryptjs');
const saltRounds = 10;

// 存储PIN码
const pinHash = await bcrypt.hash(pin, saltRounds);

// 验证PIN码
const isValid = await bcrypt.compare(pin, storedHash);
```

### 失败处理
- **错误计数**: 每个用户独立计数
- **锁定机制**: 3次失败后锁定5分钟
- **审计日志**: 记录所有登录尝试

## 前端组件

### PinInput组件
```vue
<template>
  <div class="pin-input">
    <input 
      v-for="i in 4" 
      :key="i"
      type="tel"
      maxlength="1"
      class="pin-digit"
      @input="handleInput(i-1, $event)"
    />
  </div>
</template>
```

### 特性
- 自动跳转到下一位
- 退格删除支持
- 数字键盘优化
- 完成时自动提交

## 数据库设计

### User表扩展
```sql
ALTER TABLE users ADD COLUMN pin_hash VARCHAR(60);
ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMP;
```

### 会话管理
- 使用JWT或类似机制管理登录状态
- 会话过期时间：24小时
- 支持记住设备（可选）

## 错误码定义

- `PIN_REQUIRED`: 需要设置PIN码
- `PIN_INVALID`: PIN码错误  
- `ACCOUNT_LOCKED`: 账户已锁定
- `USER_NOT_APPROVED`: 用户未审批
- `USER_NOT_FOUND`: 用户不存在
