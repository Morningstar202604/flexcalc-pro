/**
 * Rate/Percentage 值对象：税率、费率、倍率
 * 内部以万分比整数存储（1 = 0.01%），避免浮点误差
 * @packageDocumentation
 */

import { Brand, createBrandUtils } from './brand';

/** 基点（万分比）品牌类型：1 = 0.01% = 0.0001 */
export type BasisPoint = Brand<number, 'BasisPoint'>;
/** 百分比品牌类型：1 = 1% = 0.01 */
export type Percent = Brand<number, 'Percent'>;
/** 倍率品牌类型：1 = 1x = 100% */
export type Multiple = Brand<number, 'Multiple'>;

/** 百分比类型别名（兼容性） */
export type Percentage = Percent;

/** BasisPoint 工具集 */
export const BasisPoint = createBrandUtils<number, 'BasisPoint'>('BasisPoint', (v): v is number =>
  typeof v === 'number' && Number.isInteger(v) && Number.isFinite(v)
);

/** Percent 工具集 */
export const Percent = createBrandUtils<number, 'Percent'>('Percent', (v): v is number =>
  typeof v === 'number' && Number.isFinite(v)
);

/** Multiple 工具集 */
export const Multiple = createBrandUtils<number, 'Multiple'>('Multiple', (v): v is number =>
  typeof v === 'number' && Number.isFinite(v)
);

/** 比率值对象通用接口 */
export interface RateOps<R extends BasisPoint | Percent | Multiple> {
  /** 底层数值 */
  readonly value: number;

  /** 加法 */
  add(other: Rate<R>): Rate<R>;

  /** 减法 */
  subtract(other: Rate<R>): Rate<R>;

  /** 乘法（乘以纯数字） */
  multiply(factor: number): Rate<R>;

  /** 除法（除以纯数字） */
  divide(divisor: number): Rate<R>;

  /** 应用比率到金额：amount * rate */
  applyTo(amount: number): number;

  /** 反向计算：result / rate */
  reverseFrom(result: number): number;

  /** 比较：小于 */
  lt(other: Rate<R>): boolean;

  /** 比较：小于等于 */
  lte(other: Rate<R>): boolean;

  /** 比较：大于 */
  gt(other: Rate<R>): boolean;

  /** 比较：大于等于 */
  gte(other: Rate<R>): boolean;

  /** 比较：等于 */
  equals(other: Rate<R>): boolean;

  /** 比较：不等于 */
  notEquals(other: Rate<R>): boolean;

  /** 转换为数字 */
  toNumber(): number;

  /** 序列化为 JSON */
  toJSON(): number;

  /** 字符串表示 */
  toString(): string;

  /** 格式化为带单位的字符串 */
  toDisplayString(): string;

  /** 转换为小数 */
  toDecimal(): number;

  /** 安全乘法：处理 null/undefined */
  safeMul(factor: number | null | undefined): Rate<R>;

  /** 安全除法：处理 null/undefined 和除零 */
  safeDiv(divisor: number | null | undefined): Rate<R>;

  /** 安全钳制：限制在 [min, max] 范围内 */
  safeClamp(min: Rate<R>, max: Rate<R>): Rate<R>;
}

/** 通用 Rate 实现 */
export class Rate<R extends BasisPoint | Percent | Multiple> implements RateOps<R> {
  public readonly value: number;
  public readonly unit: 'BasisPoint' | 'Percent' | 'Multiple';

  private constructor(value: number, unit: 'BasisPoint' | 'Percent' | 'Multiple') {
    this.value = value;
    this.unit = unit;
  }

  /** 从基点创建 */
  static fromBasisPoint(bp: number): Rate<BasisPoint> {
    if (!Number.isInteger(bp) || !Number.isFinite(bp)) {
      throw new Error(`Invalid basis point value: ${bp}. Must be a finite integer.`);
    }
    return new Rate(bp, 'BasisPoint');
  }

  /** 从百分比创建 */
  static fromPercent(percent: number): Rate<Percent> {
    if (!Number.isFinite(percent)) {
      throw new Error(`Invalid percent value: ${percent}. Must be a finite number.`);
    }
    return new Rate(percent, 'Percent');
  }

  /** 从倍率创建 */
  static fromMultiple(multiple: number): Rate<Multiple> {
    if (!Number.isFinite(multiple)) {
      throw new Error(`Invalid multiple value: ${multiple}. Must be a finite number.`);
    }
    return new Rate(multiple, 'Multiple');
  }

  /** 从字符串创建百分比（支持 "5.5%"、"0.055"、"5.5" 格式） */
  static fromPercentString(str: string): Rate<Percent> {
    const trimmed = str.trim();
    let num: number;
    if (trimmed.endsWith('%')) {
      num = Number(trimmed.slice(0, -1));
    } else {
      num = Number(trimmed);
      // 如果值小于 1 且不包含 %，假设是小数形式（如 0.055）
      if (num < 1 && !trimmed.includes('%')) {
        num = num * 100;
      }
    }
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid percent string: ${str}`);
    }
    return new Rate(num, 'Percent');
  }

  /** 零比率 */
  static zero<R extends BasisPoint | Percent | Multiple>(
    _brand: R extends BasisPoint ? 'BasisPoint' : R extends Percent ? 'Percent' : 'Multiple'
  ): Rate<R> {
    const unit = _brand === 'BasisPoint' ? 'BasisPoint' : _brand === 'Percent' ? 'Percent' : 'Multiple';
    return new Rate(0, unit) as Rate<R>;
  }

  /** 100% / 1x / 10000bp */
  static one<R extends BasisPoint | Percent | Multiple>(
    _brand: R extends BasisPoint ? 'BasisPoint' : R extends Percent ? 'Percent' : 'Multiple'
  ): Rate<R> {
    const unit = _brand === 'BasisPoint' ? 'BasisPoint' : _brand === 'Percent' ? 'Percent' : 'Multiple';
    const value = _brand === 'BasisPoint' ? 10000 : _brand === 'Percent' ? 100 : 1;
    return new Rate(value, unit) as Rate<R>;
  }

  /** 创建实例（内部使用） */
  private static create<R extends BasisPoint | Percent | Multiple>(
    value: number,
    unit: 'BasisPoint' | 'Percent' | 'Multiple'
  ): Rate<R> {
    return new Rate(value, unit) as Rate<R>;
  }

  add(other: Rate<R>): Rate<R> {
    if (this.unit !== other.unit) {
      throw new Error('different units');
    }
    return Rate.create(this.value + other.value, this.unit);
  }

  subtract(other: Rate<R>): Rate<R> {
    if (this.unit !== other.unit) {
      throw new Error('different units');
    }
    return Rate.create(this.value - other.value, this.unit);
  }

  multiply(factor: number): Rate<R> {
    if (!Number.isFinite(factor)) {
      throw new Error(`Invalid factor: ${factor}. Must be a finite number.`);
    }
    return Rate.create(this.value * factor, this.unit);
  }

  divide(divisor: number): Rate<R> {
    if (!Number.isFinite(divisor)) {
      throw new Error(`Invalid divisor: ${divisor}. Must be a finite number.`);
    }
    if (divisor === 0) {
      throw new Error('Division by zero');
    }
    return Rate.create(this.value / divisor, this.unit);
  }

  applyTo(amount: number): number {
    if (!Number.isFinite(amount)) {
      throw new Error(`Invalid amount: ${amount}. Must be a finite number.`);
    }
    if (this.unit === 'BasisPoint') {
      return amount * this.value / 10000;
    }
    if (this.unit === 'Percent') {
      return amount * this.value / 100;
    }
    return amount * this.value;
  }

  reverseFrom(result: number): number {
    if (!Number.isFinite(result)) {
      throw new Error(`Invalid result: ${result}. Must be a finite number.`);
    }
    if (this.value === 0) {
      throw new Error('Cannot reverse from zero rate');
    }
    if (this.unit === 'BasisPoint') {
      return result * 10000 / this.value;
    }
    if (this.unit === 'Percent') {
      return result * 100 / this.value;
    }
    return result / this.value;
  }

  lt(other: Rate<R>): boolean {
    return this.value < other.value;
  }

  lte(other: Rate<R>): boolean {
    return this.value <= other.value;
  }

  gt(other: Rate<R>): boolean {
    return this.value > other.value;
  }

  gte(other: Rate<R>): boolean {
    return this.value >= other.value;
  }

  equals(other: Rate<R>): boolean {
    return this.value === other.value && this.unit === other.unit;
  }

  notEquals(other: Rate<R>): boolean {
    return !this.equals(other);
  }

  toNumber(): number {
    return this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    if (this.unit === 'BasisPoint') {
      return `${this.value}bp`;
    }
    if (this.unit === 'Percent') {
      return `${this.value}%`;
    }
    return `${this.value}x`;
  }

  toDisplayString(): string {
    if (this.unit === 'BasisPoint') {
      return `${this.value}bp`;
    }
    if (this.unit === 'Percent') {
      return `${this.value}%`;
    }
    return `${this.value}x`;
  }

  toDecimal(): number {
    if (this.unit === 'BasisPoint') {
      return this.value / 10000;
    }
    if (this.unit === 'Percent') {
      return this.value / 100;
    }
    return this.value;
  }

  safeMul(factor: number | null | undefined): Rate<R> {
    if (factor === null || factor === undefined || !Number.isFinite(factor)) {
      return Rate.fromPercent(0) as Rate<R>;
    }
    return this.multiply(factor);
  }

  safeDiv(divisor: number | null | undefined): Rate<R> {
    if (divisor === null || divisor === undefined || !Number.isFinite(divisor) || divisor === 0) {
      return Rate.fromPercent(0) as Rate<R>;
    }
    return this.divide(divisor);
  }

  safeClamp(min: Rate<R>, max: Rate<R>): Rate<R> {
    if (this.unit !== min.unit || this.unit !== max.unit) {
      throw new Error('Cannot clamp rates with different units');
    }
    const clamped = Math.max(min.value, Math.min(this.value, max.value));
    return Rate.create(clamped, this.unit);
  }

  /** 转换为基点 */
  toBasisPoint(): Rate<BasisPoint> {
    if (this.unit === 'BasisPoint') {
      return Rate.create(this.value, 'BasisPoint');
    }
    if (this.unit === 'Percent') {
      // percent -> basis point: value * 100
      const bpValue = Math.round(this.value * 100);
      return Rate.create(bpValue, 'BasisPoint');
    }
    if (this.unit === 'Multiple') {
      // multiple -> basis point: value * 10000
      const bpValue = Math.round(this.value * 10000);
      return Rate.create(bpValue, 'BasisPoint');
    }
    return Rate.create(this.value, 'BasisPoint');
  }

  /** 转换为百分比 */
  toPercent(): Rate<Percent> {
    if (this.unit === 'Percent') {
      return Rate.create(this.value, 'Percent');
    }
    if (this.unit === 'BasisPoint') {
      // basis point -> percent: value / 100
      const pctValue = Math.round(this.value / 100);
      return Rate.create(pctValue, 'Percent');
    }
    if (this.unit === 'Multiple') {
      // multiple -> percent: value * 100
      const pctValue = Math.round(this.value * 100);
      return Rate.create(pctValue, 'Percent');
    }
    return Rate.create(this.value, 'Percent');
  }

  /** 转换为倍率 */
  toMultiple(): Rate<Multiple> {
    if (this.unit === 'Multiple') {
      return Rate.create(this.value, 'Multiple');
    }
    if (this.unit === 'BasisPoint') {
      // basis point -> multiple: value / 10000
      const multValue = Math.round(this.value / 10000);
      return Rate.create(multValue, 'Multiple');
    }
    if (this.unit === 'Percent') {
      // percent -> multiple: value / 100
      const multValue = Math.round(this.value / 100);
      return Rate.create(multValue, 'Multiple');
    }
    return Rate.create(this.value, 'Multiple');
  }

  isZero(): boolean {
    return this.value === 0;
  }

  isNegative(): boolean {
    return this.value < 0;
  }

  isPositive(): boolean {
    return this.value > 0;
  }
}

/** 创建基点比率的便捷函数 */
export function bp(value: number): Rate<BasisPoint> {
  return Rate.fromBasisPoint(value);
}

/** 创建百分比比率的便捷函数 */
export function pct(value: number): Rate<Percent> {
  return Rate.fromPercent(value);
}

/** 创建百分比比率的便捷函数 (别名) */
export const percent = pct;

/** 创建倍率比率的便捷函数 */
export function multiple(value: number): Rate<Multiple> {
  return Rate.fromMultiple(value);
}

/** 从字符串解析百分比 */
export function parsePercent(str: string): Rate<Percent> {
  return Rate.fromPercentString(str);
}

/** 安全相加：处理 null/undefined */
export function safeAdd(a: Rate<Percent> | null | undefined, b: Rate<Percent> | null | undefined): Rate<Percent> {
  const aVal = a?.value ?? 0;
  const bVal = b?.value ?? 0;
  return pct(aVal + bVal);
}

/** 安全相减：处理 null/undefined */
export function safeSub(a: Rate<Percent> | null | undefined, b: Rate<Percent> | null | undefined): Rate<Percent> {
  const aVal = a?.value ?? 0;
  const bVal = b?.value ?? 0;
  return pct(aVal - bVal);
}

/** 安全乘法：处理 null/undefined */
export function safeMul(a: Rate<Percent> | null | undefined, factor: number | null | undefined): Rate<Percent> {
  const aVal = a?.value ?? 0;
  const f = factor ?? 1;
  return pct(aVal * f);
}

/** 安全除法：处理 null/undefined 和除零 */
export function safeDiv(a: Rate<Percent> | null | undefined, divisor: number | null | undefined): Rate<Percent> {
  const aVal = a?.value ?? 0;
  const d = divisor ?? 1;
  if (d === 0) return pct(0);
  return pct(aVal / d);
}

/** 比率复合：(1 + r1) * (1 + r2) - 1 */
export function compound(...rates: Rate<Percent>[]): Rate<Percent> {
  if (rates.length === 0) return Rate.zero('Percent');
  if (rates.length === 1) return rates[0];

  // 所有率必须是百分比单位
  for (const r of rates) {
    if (r.unit !== 'Percent') {
      throw new Error('Cannot compound rates with different units');
    }
  }

  // 复合公式: (1 + r1) * (1 + r2) - 1
  // 内部以百分比计算，结果值为百分比形式（如 32 代表 32%）
  let result = 1;
  for (const r of rates) {
    const pctValue = r.value / 100;
    result *= (1 + pctValue);
  }
  result = Math.round((result - 1) * 10000) / 10000; // 四舍五入到小数点后4位
  // 结果直接乘以 100 得到百分比形式的值（如 0.32 -> 32，0.716 -> 71.6）
  return Rate.fromPercent(result * 100);
}

/** 是否为零 */
export function isZero(r: Rate<BasisPoint | Percent | Multiple>): boolean {
  return r.isZero();
}

/** 是否为负数 */
export function isNegative(r: Rate<BasisPoint | Percent | Multiple>): boolean {
  return r.isNegative();
}

/** 是否为正数 */
export function isPositive(r: Rate<BasisPoint | Percent | Multiple>): boolean {
  return r.isPositive();
}

/** BasisPoint 类型别名 */
export type BasisPointRate = Rate<BasisPoint>;
/** Percent 类型别名 */
export type PercentRate = Rate<Percent>;
/** Multiple 类型别名 */
export type MultipleRate = Rate<Multiple>;