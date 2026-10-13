/**
 * Money 值对象单元测试
 * 覆盖率目标：100%（边界：NaN、Infinity、负数、大数、精度）
 */

import { describe, it, expect } from 'vitest';
import {
  Money,
  Cent,
  Yuan,
  cent,
  yuan,
  parseYuan,
  safeAdd,
  sum,
  CentMoney,
  YuanMoney,
} from '../../../src/domain/shared/money';

describe('Money 值对象', () => {
  describe('CentMoney (分)', () => {
    it('应从整数分创建', () => {
      const m = Money.fromCent(100);
      expect(m.value).toBe(100);
      expect(m.toNumber()).toBe(100);
    });

    it('应拒绝非整数分', () => {
      expect(() => Money.fromCent(100.5)).toThrow('Must be a finite integer');
      expect(() => Money.fromCent(NaN)).toThrow('Must be a finite integer');
      expect(() => Money.fromCent(Infinity)).toThrow('Must be a finite integer');
      expect(() => Money.fromCent(-Infinity)).toThrow('Must be a finite integer');
    });

    it('应支持负数分', () => {
      const m = Money.fromCent(-500);
      expect(m.value).toBe(-500);
    });

    it('应支持大数分', () => {
      const m = Money.fromCent(Number.MAX_SAFE_INTEGER);
      expect(m.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('便捷函数 cent() 应工作', () => {
      const m = cent(999);
      expect(m.value).toBe(999);
    });
  });

  describe('YuanMoney (元)', () => {
    it('应从数字元创建', () => {
      const m = Money.fromYuan(100.5);
      expect(m.value).toBe(100.5);
    });

    it('应拒绝非有限数字', () => {
      expect(() => Money.fromYuan(NaN)).toThrow('Must be a finite number');
      expect(() => Money.fromYuan(Infinity)).toThrow('Must be a finite number');
      expect(() => Money.fromYuan(-Infinity)).toThrow('Must be a finite number');
    });

    it('应支持负数元', () => {
      const m = Money.fromYuan(-99.99);
      expect(m.value).toBe(-99.99);
    });

    it('应支持大数元', () => {
      const m = Money.fromYuan(1e15);
      expect(m.value).toBe(1e15);
    });

    it('应从字符串创建', () => {
      const m = Money.fromString('123.45');
      expect(m.value).toBe(123.45);
    });

    it('应拒绝无效字符串', () => {
      expect(() => Money.fromString('abc')).toThrow('Invalid money string');
      expect(() => Money.fromString('')).toThrow('Invalid money string');
    });

    it('便捷函数 yuan() 应工作', () => {
      const m = yuan(88.88);
      expect(m.value).toBe(88.88);
    });

    it('便捷函数 parseYuan() 应工作', () => {
      const m = parseYuan('55.55');
      expect(m.value).toBe(55.55);
    });
  });

  describe('零值', () => {
    it('Cent 零值', () => {
      const m = Money.zero('Cent');
      expect(m.value).toBe(0);
      expect(m.toNumber()).toBe(0);
    });

    it('Yuan 零值', () => {
      const m = Money.zero('Yuan');
      expect(m.value).toBe(0);
    });
  });

  describe('加法', () => {
    it('Cent 加法', () => {
      const a = cent(100);
      const b = cent(200);
      expect(a.add(b).value).toBe(300);
    });

    it('Yuan 加法', () => {
      const a = yuan(1.5);
      const b = yuan(2.5);
      expect(a.add(b).value).toBe(4.0);
    });

    it('负数加法', () => {
      const a = cent(100);
      const b = cent(-50);
      expect(a.add(b).value).toBe(50);
    });

    it('大数加法', () => {
      const a = cent(Number.MAX_SAFE_INTEGER - 100);
      const b = cent(50);
      expect(a.add(b).value).toBe(Number.MAX_SAFE_INTEGER - 50);
    });
  });

  describe('减法', () => {
    it('Cent 减法', () => {
      const a = cent(300);
      const b = cent(100);
      expect(a.subtract(b).value).toBe(200);
    });

    it('结果为负', () => {
      const a = cent(50);
      const b = cent(100);
      expect(a.subtract(b).value).toBe(-50);
    });
  });

  describe('乘法', () => {
    it('Cent 乘整数', () => {
      const m = cent(100);
      expect(m.multiply(3).value).toBe(300);
    });

    it('Cent 乘小数', () => {
      const m = cent(100);
      expect(m.multiply(1.5).value).toBe(150);
    });

    it('乘以零', () => {
      const m = cent(100);
      expect(m.multiply(0).value).toBe(0);
    });

    it('乘以负数', () => {
      const m = cent(100);
      expect(m.multiply(-2).value).toBe(-200);
    });

    it('应拒绝非有限因子', () => {
      expect(() => cent(100).multiply(NaN)).toThrow('Must be a finite number');
      expect(() => cent(100).multiply(Infinity)).toThrow('Must be a finite number');
    });
  });

  describe('除法', () => {
    it('Cent 除整数', () => {
      const m = cent(300);
      expect(m.divide(3).value).toBe(100);
    });

    it('Cent 除小数', () => {
      const m = cent(100);
      expect(m.divide(2).value).toBe(50);
    });

    it('应拒绝除零', () => {
      expect(() => cent(100).divide(0)).toThrow('Division by zero');
    });

    it('应拒绝非有限除数', () => {
      expect(() => cent(100).divide(NaN)).toThrow('Must be a finite number');
      expect(() => cent(100).divide(Infinity)).toThrow('Must be a finite number');
    });
  });

  describe('比较', () => {
    const a = cent(100);
    const b = cent(200);
    const c = cent(100);

    it('lt', () => {
      expect(a.lt(b)).toBe(true);
      expect(b.lt(a)).toBe(false);
      expect(a.lt(c)).toBe(false);
    });

    it('lte', () => {
      expect(a.lte(b)).toBe(true);
      expect(a.lte(c)).toBe(true);
      expect(b.lte(a)).toBe(false);
    });

    it('gt', () => {
      expect(b.gt(a)).toBe(true);
      expect(a.gt(b)).toBe(false);
      expect(a.gt(c)).toBe(false);
    });

    it('gte', () => {
      expect(b.gte(a)).toBe(true);
      expect(a.gte(c)).toBe(true);
      expect(a.gte(b)).toBe(false);
    });

    it('equals', () => {
      expect(a.equals(c)).toBe(true);
      expect(a.equals(b)).toBe(false);
    });

    it('notEquals', () => {
      expect(a.notEquals(b)).toBe(true);
      expect(a.notEquals(c)).toBe(false);
    });
  });

  describe('绝对值与取反', () => {
    it('abs', () => {
      expect(cent(-100).abs().value).toBe(100);
      expect(cent(100).abs().value).toBe(100);
      expect(cent(0).abs().value).toBe(0);
    });

    it('negate', () => {
      expect(cent(100).negate().value).toBe(-100);
      expect(cent(-100).negate().value).toBe(100);
      expect(cent(0).negate().value).toBe(0);
    });
  });

  describe('序列化', () => {
    it('toJSON', () => {
      expect(cent(123).toJSON()).toBe(123);
      expect(yuan(45.67).toJSON()).toBe(45.67);
    });

    it('toString', () => {
      expect(cent(123).toString()).toBe('123');
      expect(yuan(45.67).toString()).toBe('45.67');
    });

    it('toDisplayString', () => {
      expect(cent(12345).toDisplayString()).toBe('¥123.45');
      expect(cent(-99).toDisplayString()).toBe('¥-0.99');
      expect(yuan(123.45).toDisplayString()).toBe('¥123.45');
    });
  });

  describe('单位转换', () => {
    it('toCent', () => {
      const m = yuan(123.45);
      const c = m.toCent();
      expect(c.value).toBe(12345);
      expect(Cent.is(c.value)).toBe(true);
    });

    it('toYuan', () => {
      const m = cent(12345);
      const y = m.toYuan();
      expect(y.value).toBe(123.45);
      expect(Yuan.is(y.value)).toBe(true);
    });

    it('getCents', () => {
      expect(cent(12345).getCents()).toBe(12345);
      expect(yuan(123.45).getCents()).toBe(12345);
    });

    it('getYuan', () => {
      expect(cent(12345).getYuan()).toBe(123.45);
      expect(yuan(123.45).getYuan()).toBe(123.45);
    });

    it('精度处理：避免浮点误差', () => {
      const a = yuan(0.1);
      const b = yuan(0.2);
      const sum = a.add(b);
      expect(sum.getYuan()).toBe(0.3);
      expect(sum.getCents()).toBe(30);
    });
  });

  describe('safeAdd', () => {
    it('正常相加', () => {
      expect(safeAdd(cent(100), cent(200)).value).toBe(300);
    });

    it('处理 null/undefined', () => {
      expect(safeAdd(cent(100), null).value).toBe(100);
      expect(safeAdd(null, cent(200)).value).toBe(200);
      expect(safeAdd(null, null).value).toBe(0);
      expect(safeAdd(undefined, undefined).value).toBe(0);
    });
  });

  describe('sum', () => {
    it('多个值求和', () => {
      expect(sum(cent(100), cent(200), cent(300)).value).toBe(600);
    });

    it('包含 null/undefined', () => {
      expect(sum(cent(100), null, cent(200), undefined).value).toBe(300);
    });

    it('空数组返回零', () => {
      expect(sum<CentMoney>().value).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('NaN 输入应被拒绝', () => {
      expect(() => Money.fromCent(NaN)).toThrow();
      expect(() => Money.fromYuan(NaN)).toThrow();
    });

    it('Infinity 输入应被拒绝', () => {
      expect(() => Money.fromCent(Infinity)).toThrow();
      expect(() => Money.fromYuan(Infinity)).toThrow();
      expect(() => Money.fromCent(-Infinity)).toThrow();
      expect(() => Money.fromYuan(-Infinity)).toThrow();
    });

    it('极大数值', () => {
      const maxSafe = Number.MAX_SAFE_INTEGER;
      const m = cent(maxSafe);
      expect(m.value).toBe(maxSafe);
      expect(m.add(cent(0)).value).toBe(maxSafe);
    });

    it('极小数值', () => {
      const m = cent(Number.MIN_SAFE_INTEGER);
      expect(m.value).toBe(Number.MIN_SAFE_INTEGER);
    });
  });
});
