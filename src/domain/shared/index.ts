/**
 * Domain Shared Kernel - 导出入口
 * 纯 TypeScript，零框架依赖
 * @packageDocumentation
 */

// Brand 类型工具
export * from './brand';

// Money 值对象
export * from './money';

// Rate 值对象
// money 与 rate 各自提供 safeAdd/safeSub，re-export 时显式点名以免歧义
export { Rate, pct } from './rate';

// Date 值对象
export * from './date';

// Result 统一错误处理
export * from './result';

// Guards 类型收窄
export * from './guards';
