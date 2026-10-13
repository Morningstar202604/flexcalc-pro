/**
 * Money 值对象：Cent（分）与 Yuan（元）
 * 所有金额运算以分为单位整数运算，彻底避免浮点误差
 * @packageDocumentation
 */

import { Brand, createBrandUtils } from './brand';
import type { Rate as RateValue, Percent } from './rate';

/** 分（最小货币单位）品牌类型 */
export type Cent = Brand<number, 'Cent'>;
/** 元品牌类型 */
export type Yuan = Brand<number, 'Yuan'>;

/** 货币单位枚举 */
export enum MoneyUnit {
  Cent = 'cent',
  Yuan = 'yuan',
}

/** Cent 工具集 */
export const Cent = createBrandUtils<number, 'Cent'>('Cent', (v): v is number =>
  typeof v === 'number' && Number.isInteger(v) && Number.isFinite(v)
);

/** Yuan 工具集 */
export const Yuan = createBrandUtils<number, 'Yuan'>('Yuan', (v): v is number =>
  typeof v === 'number' && Number.isFinite(v)
);

/** 金额值对象接口 */
export interface MoneyOps<M extends Cent | Yuan> {
  /** 底层数值（分） */
  readonly value: number;
  /** 单位类型 */
  readonly unit: MoneyUnit;
  /** 加法 */
  add(other: Money<M>): Money<M>;
  /** 减法 */
  subtract(other: Money<M>): Money<M>;
  /** 乘法（乘以纯数字） */
  multiply(factor: number): Money<M>;
  /** 除法（除以纯数字） */
  divide(divisor: number): Money<M>;
  /** 比较：小于 */
  lt(other: Money<M>): boolean;
  /** 比较：小于等于 */
  lte(other: Money<M>): boolean;
  /** 比较：大于 */
  gt(other: Money<M>): boolean;
  /** 比较：大于等于 */
  gte(other: Money<M>): boolean;
  /** 比较：等于 */
  equals(other: Money<M>): boolean;
  /** 比较：不等于 */
  notEquals(other: Money<M>): boolean;
  /** 绝对值 */
  abs(): Money<M>;
  /** 取反 */
  negate(): Money<M>;
  /** 转换为数字（分或元） */
  toNumber(): number;
  /** 序列化为 JSON */
  toJSON(): number;
  /** 字符串表示 */
  toString(): string;
  /** 格式化为带单位的字符串 */
  toDisplayString(): string;
}

/** 通用 Money 实现 */
export class Money<M extends Cent | Yuan> implements MoneyOps<M> {
  public readonly value: number;
  public readonly unit: MoneyUnit;
  private readonly _brand: M;

  private constructor(value: number, unit: MoneyUnit, brand: M) {
    this.value = value;
    this.unit = unit;
    this._brand = brand;
  }

  /** 从分创建 */
  static fromCent(cent: number): Money<Cent> {
    if (!Number.isInteger(cent) || !Number.isFinite(cent)) {
      throw new Error(`Invalid cent value: ${cent}. Must be a finite integer.`);
    }
    return new Money(cent, MoneyUnit.Cent, Cent.create(cent));
  }

  /** 从元创建 */
  static fromYuan(yuan: number): Money<Yuan> {
    if (!Number.isFinite(yuan)) {
      throw new Error(`Invalid yuan value: ${yuan}. Must be a finite number.`);
    }
    return new Money(yuan, MoneyUnit.Yuan, Yuan.create(yuan));
  }

  /** 从字符串创建（支持 "100.50" 格式） */
  static fromString(str: string): Money<Yuan> {
    if (!str || !str.trim()) {
      throw new Error(`Invalid money string: ${str}`);
    }
    const num = Number(str);
    if (!Number.isFinite(num)) {
      throw new Error(`Invalid money string: ${str}`);
    }
    return Money.fromYuan(num);
  }

  /** 从字符串创建（支持 "100.50" 格式），别名 for fromString */
  static parseYuan(str: string): Money<Yuan> {
    return Money.fromString(str);
  }

  /** 零值 */
  static zero<M extends Cent | Yuan>(_brand: M extends Cent ? 'Cent' : 'Yuan'): Money<M> {
    const unit = _brand === 'Cent' ? MoneyUnit.Cent : MoneyUnit.Yuan
    const brand = (_brand === 'Cent' ? Cent.create(0) : Yuan.create(0)) as M
    return new Money(0, unit, brand)
  }

  add(other: Money<M>): Money<M> {
    if (this.unit === MoneyUnit.Yuan && other.unit === MoneyUnit.Yuan) {
      // Yuan 运算：转分整数运算，避免浮点误差
      const thisCent = Math.round(this.value * 100);
      const otherCent = Math.round(other.value * 100);
      return new Money((thisCent + otherCent) / 100, MoneyUnit.Yuan, Yuan.create((thisCent + otherCent) / 100)) as Money<M>;
    }
    return new Money(this.value + other.value, this.unit, this._brand);
  }

  subtract(other: Money<M>): Money<M> {
    if (this.unit === MoneyUnit.Yuan && other.unit === MoneyUnit.Yuan) {
      const thisCent = Math.round(this.value * 100);
      const otherCent = Math.round(other.value * 100);
      return new Money((thisCent - otherCent) / 100, MoneyUnit.Yuan, Yuan.create((thisCent - otherCent) / 100)) as Money<M>;
    }
    return new Money(this.value - other.value, this.unit, this._brand);
  }

  multiply(factor: number): Money<M> {
    if (!Number.isFinite(factor)) {
      throw new Error(`Invalid factor: ${factor}. Must be a finite number.`);
    }
    if (this.unit === MoneyUnit.Yuan) {
      const thisCent = Math.round(this.value * 100);
      return new Money((thisCent * factor) / 100, MoneyUnit.Yuan, Yuan.create((thisCent * factor) / 100)) as Money<M>;
    }
    return new Money(this.value * factor, this.unit, this._brand);
  }

  divide(divisor: number): Money<M> {
    if (!Number.isFinite(divisor)) {
      throw new Error(`Invalid divisor: ${divisor}. Must be a finite number.`);
    }
    if (divisor === 0) {
      throw new Error('Division by zero');
    }
    if (this.unit === MoneyUnit.Yuan) {
      const thisCent = Math.round(this.value * 100);
      return new Money((thisCent / divisor) / 100, MoneyUnit.Yuan, Yuan.create((thisCent / divisor) / 100)) as Money<M>;
    }
    return new Money(this.value / divisor, this.unit, this._brand);
  }

  lt(other: Money<M>): boolean {
    return this.value < other.value;
  }

  lte(other: Money<M>): boolean {
    return this.value <= other.value;
  }

  gt(other: Money<M>): boolean {
    return this.value > other.value;
  }

  gte(other: Money<M>): boolean {
    return this.value >= other.value;
  }

  equals(other: Money<M>): boolean {
    return this.value === other.value && this.unit === other.unit;
  }

  notEquals(other: Money<M>): boolean {
    return !this.equals(other);
  }

  abs(): Money<M> {
    return new Money(Math.abs(this.value), this.unit, this._brand);
  }

  negate(): Money<M> {
    const negated = -this.value;
    // 处理 -0 的情况
    return new Money(negated === 0 ? 0 : negated, this.unit, this._brand);
  }

  toNumber(): number {
    return this.value;
  }

  toJSON(): number {
    return this.value;
  }

  toString(): string {
    if (this.unit === MoneyUnit.Yuan) {
      return this.value.toFixed(2);
    }
    // Cent: 返回整数字符串
    return Math.round(this.value).toString();
  }

  toDisplayString(): string {
    if (this.unit === MoneyUnit.Cent) {
      const yuan = (this.value / 100).toFixed(2);
      return `\u00A5${yuan}`;
    }
    return `\u00A5${this.value.toFixed(2)}`;
  }

  /** 转换为分表示 */
  toCent(): Money<Cent> {
    if (this.unit === MoneyUnit.Cent) {
      return this as unknown as Money<Cent>;
    }
    const cent = Math.round(this.value * 100);
    return Money.fromCent(cent);
  }

  /** 转换为元表示 */
  toYuan(): Money<Yuan> {
    if (this.unit === MoneyUnit.Yuan) {
      return this as unknown as Money<Yuan>;
    }
    // Cent 转 Yuan：除以 100
    const yuan = this.value / 100;
    return Money.fromYuan(yuan);
  }

  /** 获取分的整数部分 */
  getCents(): number {
    return this.unit === MoneyUnit.Cent ? this.value : Math.round(this.value * 100);
  }

  /** 获取元的数值（四舍五入到分） */
  getYuan(): number {
    if (this.unit === MoneyUnit.Yuan) {
      return Math.round(this.value * 100) / 100;
    }
    // Cent: 除以 100 转为元
    return this.value / 100;
  }
}

/** Cent Money 类型别名 */
export type CentMoney = Money<Cent>;
/** Yuan Money 类型别名 */
export type YuanMoney = Money<Yuan>;

/** 创建 Cent 金额的便捷函数 */
export function cent(value: number): CentMoney {
  return Money.fromCent(value);
}

/** 创建 Yuan 金额的便捷函数 */
export function yuan(value: number): YuanMoney {
  if (!Number.isFinite(value)) {
    return Money.fromYuan(0);
  }
  return Money.fromYuan(value);
}

/** 从字符串解析元金额（别名 for Money.fromString） */
export function parseYuan(str: string): YuanMoney {
  return Money.fromString(str);
}

/** 安全相加：处理 null/undefined */
export function safeAdd(a: CentMoney | null | undefined, b: CentMoney | null | undefined): CentMoney {
  const aVal = a?.value ?? 0;
  const bVal = b?.value ?? 0;
  return cent(aVal + bVal);
}

/** 求和：支持多个值，自动处理 null/undefined */
export function sum(...values: (CentMoney | null | undefined)[]): CentMoney {
  let total = 0;
  for (const v of values) {
    if (v != null) total += v.value;
  }
  return cent(total);
}

/** Cent 非负保护 */
export function nonNegCent(cent: Cent): Cent {
  return Cent.create(Math.max(0, cent));
}

/** 安全转换为 Cent（非有限值归零） */
export function safeCent(n: number): Cent {
  return Cent.create(Number.isFinite(n) ? n : 0);
}