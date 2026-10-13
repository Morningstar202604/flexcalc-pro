/**
 * Rate/Percentage 值对象单元测试
 * 覆盖率目标：100%（边界：NaN、Infinity、负数、大数、精度）
 */

import { describe, it, expect } from 'vitest';
import {
  Rate,
  BasisPoint,
  Percent,
  Multiple,
  bp,
  percent,
  multiple,
  parsePercent,
  compound,
  safeAdd,
  BasisPointRate,
  PercentRate,
  MultipleRate,
} from '../../../src/domain/shared/rate';

describe('Rate 值对象', () => {
  describe('BasisPoint (基点)', () => {
    it('应从整数基点创建', () => {
      const r = Rate.fromBasisPoint(10000); // 100%
      expect(r.value).toBe(10000);
      expect(r.toDecimal()).toBe(1);
    });

    it('应拒绝非整数基点', () => {
      expect(() => Rate.fromBasisPoint(100.5)).toThrow('Must be a finite integer');
      expect(() => Rate.fromBasisPoint(NaN)).toThrow('Must be a finite integer');
      expect(() => Rate.fromBasisPoint(Infinity)).toThrow('Must be a finite integer');
    });

    it('应支持负数基点', () => {
      const r = Rate.fromBasisPoint(-500); // -5%
      expect(r.value).toBe(-500);
      expect(r.toDecimal()).toBe(-0.05);
    });

    it('便捷函数 bp() 应工作', () => {
      const r = bp(2500); // 25%
      expect(r.value).toBe(2500);
    });
  });

  describe('Percent (百分比)', () => {
    it('应从数字百分比创建', () => {
      const r = Rate.fromPercent(5.5); // 5.5%
      expect(r.value).toBe(5.5);
      expect(r.toDecimal()).toBe(0.055);
    });

    it('应拒绝非有限数字', () => {
      expect(() => Rate.fromPercent(NaN)).toThrow('Must be a finite number');
      expect(() => Rate.fromPercent(Infinity)).toThrow('Must be a finite number');
    });

    it('应支持负数百分比', () => {
      const r = Rate.fromPercent(-10); // -10%
      expect(r.value).toBe(-10);
      expect(r.toDecimal()).toBe(-0.1);
    });

    it('应从字符串创建（带 %）', () => {
      const r = Rate.fromPercentString('5.5%');
      expect(r.value).toBe(5.5);
    });

    it('应从字符串创建（小数形式）', () => {
      const r = Rate.fromPercentString('0.055');
      expect(r.value).toBe(5.5);
    });

    it('应从字符串创建（纯数字）', () => {
      const r = Rate.fromPercentString('5.5');
      expect(r.value).toBe(5.5);
    });

    it('便捷函数 percent() 应工作', () => {
      const r = percent(7.5);
      expect(r.value).toBe(7.5);
    });

    it('便捷函数 parsePercent() 应工作', () => {
      const r = parsePercent('12.5%');
      expect(r.value).toBe(12.5);
    });
  });

  describe('Multiple (倍率)', () => {
    it('应从数字倍率创建', () => {
      const r = Rate.fromMultiple(1.5); // 1.5x
      expect(r.value).toBe(1.5);
      expect(r.toDecimal()).toBe(1.5);
    });

    it('应拒绝非有限数字', () => {
      expect(() => Rate.fromMultiple(NaN)).toThrow('Must be a finite number');
      expect(() => Rate.fromMultiple(Infinity)).toThrow('Must be a finite number');
    });

    it('便捷函数 multiple() 应工作', () => {
      const r = multiple(2);
      expect(r.value).toBe(2);
    });
  });

  describe('零值与单位值', () => {
    it('零基点', () => {
      const r = Rate.zero('BasisPoint');
      expect(r.value).toBe(0);
      expect(r.isZero()).toBe(true);
    });

    it('零百分比', () => {
      const r = Rate.zero('Percent');
      expect(r.value).toBe(0);
    });

    it('零倍率', () => {
      const r = Rate.zero('Multiple');
      expect(r.value).toBe(0);
    });

    it('单位基点 (100%)', () => {
      const r = Rate.one('BasisPoint');
      expect(r.value).toBe(10000);
      expect(r.toDecimal()).toBe(1);
    });

    it('单位百分比 (100%)', () => {
      const r = Rate.one('Percent');
      expect(r.value).toBe(100);
      expect(r.toDecimal()).toBe(1);
    });

    it('单位倍率 (1x)', () => {
      const r = Rate.one('Multiple');
      expect(r.value).toBe(1);
      expect(r.toDecimal()).toBe(1);
    });
  });

  describe('加法', () => {
    it('基点加法', () => {
      const a = bp(5000); // 50%
      const b = bp(3000); // 30%
      expect(a.add(b).value).toBe(8000); // 80%
    });

    it('百分比加法', () => {
      const a = percent(10);
      const b = percent(20);
      expect(a.add(b).value).toBe(30);
    });

    it('倍率加法', () => {
      const a = multiple(1.5);
      const b = multiple(0.5);
      expect(a.add(b).value).toBe(2.0);
    });

    it('不同单位应报错', () => {
      expect(() => bp(100).add(percent(1) as any)).toThrow('different units');
    });
  });

  describe('减法', () => {
    it('基点减法', () => {
      const a = bp(8000);
      const b = bp(3000);
      expect(a.subtract(b).value).toBe(5000);
    });

    it('结果为负', () => {
      const a = bp(1000);
      const b = bp(5000);
      expect(a.subtract(b).value).toBe(-4000);
    });
  });

  describe('乘法', () => {
    it('基点乘整数', () => {
      const r = bp(1000);
      expect(r.multiply(3).value).toBe(3000);
    });

    it('基点乘小数', () => {
      const r = bp(1000);
      expect(r.multiply(1.5).value).toBe(1500);
    });

    it('应拒绝非有限因子', () => {
      expect(() => bp(100).multiply(NaN)).toThrow('Must be a finite number');
    });
  });

  describe('除法', () => {
    it('基点除整数', () => {
      const r = bp(3000);
      expect(r.divide(3).value).toBe(1000);
    });

    it('应拒绝除零', () => {
      expect(() => bp(100).divide(0)).toThrow('Division by zero');
    });
  });

  describe('applyTo (应用到金额)', () => {
    it('基点应用', () => {
      const r = bp(10000); // 100%
      expect(r.applyTo(1000)).toBe(1000);
    });

    it('百分比应用', () => {
      const r = percent(10); // 10%
      expect(r.applyTo(1000)).toBe(100);
    });

    it('倍率应用', () => {
      const r = multiple(1.5); // 1.5x
      expect(r.applyTo(1000)).toBe(1500);
    });

    it('应拒绝非有限金额', () => {
      expect(() => bp(100).applyTo(NaN)).toThrow('Must be a finite number');
    });
  });

  describe('reverseFrom (反向计算)', () => {
    it('基点反向', () => {
      const r = bp(5000); // 50%
      expect(r.reverseFrom(500)).toBe(1000);
    });

    it('百分比反向', () => {
      const r = percent(20); // 20%
      expect(r.reverseFrom(200)).toBe(1000);
    });

    it('应拒绝零比率', () => {
      expect(() => Rate.zero('Percent').reverseFrom(100)).toThrow('zero rate');
    });
  });

  describe('比较', () => {
    const a = percent(10);
    const b = percent(20);
    const c = percent(10);

    it('lt/lte/gt/gte', () => {
      expect(a.lt(b)).toBe(true);
      expect(b.lt(a)).toBe(false);
      expect(a.lte(c)).toBe(true);
      expect(b.gt(a)).toBe(true);
      expect(a.gte(c)).toBe(true);
    });

    it('equals/notEquals', () => {
      expect(a.equals(c)).toBe(true);
      expect(a.notEquals(b)).toBe(true);
    });
  });

  describe('单位转换', () => {
    it('toBasisPoint', () => {
      expect(percent(1).toBasisPoint().value).toBe(100);
      expect(multiple(1).toBasisPoint().value).toBe(10000);
    });

    it('toPercent', () => {
      expect(bp(5000).toPercent().value).toBe(50);
      expect(multiple(1.5).toPercent().value).toBe(150);
    });

    it('toMultiple', () => {
      expect(percent(100).toMultiple().value).toBe(1);
      expect(bp(10000).toMultiple().value).toBe(1);
    });

    it('toDecimal', () => {
      expect(percent(50).toDecimal()).toBe(0.5);
      expect(bp(5000).toDecimal()).toBe(0.5);
      expect(multiple(2).toDecimal()).toBe(2);
    });
  });

  describe('状态检查', () => {
    it('isZero', () => {
      expect(percent(0).isZero()).toBe(true);
      expect(percent(0.001).isZero()).toBe(false);
    });

    it('isNegative', () => {
      expect(percent(-5).isNegative()).toBe(true);
      expect(percent(0).isNegative()).toBe(false);
      expect(percent(5).isNegative()).toBe(false);
    });

    it('isPositive', () => {
      expect(percent(5).isPositive()).toBe(true);
      expect(percent(0).isPositive()).toBe(false);
      expect(percent(-5).isPositive()).toBe(false);
    });
  });

  describe('序列化', () => {
    it('toJSON', () => {
      expect(bp(1234).toJSON()).toBe(1234);
      expect(percent(5.5).toJSON()).toBe(5.5);
      expect(multiple(2).toJSON()).toBe(2);
    });

    it('toDisplayString', () => {
      expect(bp(5000).toDisplayString()).toBe('5000bp');
      expect(percent(12.5).toDisplayString()).toBe('12.5%');
      expect(multiple(1.5).toDisplayString()).toBe('1.5x');
    });
  });

  describe('复合比率', () => {
    it('compound 两个比率', () => {
      // (1 + 10%) * (1 + 20%) - 1 = 1.1 * 1.2 - 1 = 0.32 = 32%
      const r = compound(percent(10), percent(20));
      expect(r.value).toBeCloseTo(32, 10);
    });

    it('compound 多个比率', () => {
      // (1+10%)*(1+20%)*(1+30%)-1 = 1.716 - 1 = 71.6%
      const r = compound(percent(10), percent(20), percent(30));
      expect(r.value).toBeCloseTo(71.6, 10);
    });

    it('compound 零比率', () => {
      const r = compound(percent(0), percent(0));
      expect(r.value).toBe(0);
    });
  });

  describe('safeAdd', () => {
    it('正常相加', () => {
      expect(safeAdd(percent(10), percent(20)).value).toBe(30);
    });

    it('处理 null/undefined', () => {
      expect(safeAdd(percent(10), null).value).toBe(10);
      expect(safeAdd(null, percent(20)).value).toBe(20);
      expect(safeAdd(null, null).value).toBe(0);
    });
  });

  describe('边界情况', () => {
    it('NaN 输入应被拒绝', () => {
      expect(() => Rate.fromPercent(NaN)).toThrow();
      expect(() => Rate.fromBasisPoint(NaN)).toThrow();
      expect(() => Rate.fromMultiple(NaN)).toThrow();
    });

    it('Infinity 输入应被拒绝', () => {
      expect(() => Rate.fromPercent(Infinity)).toThrow();
      expect(() => Rate.fromBasisPoint(Infinity)).toThrow();
      expect(() => Rate.fromMultiple(Infinity)).toThrow();
    });

    it('极大数值', () => {
      const r = percent(Number.MAX_SAFE_INTEGER);
      expect(r.value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('精度：避免浮点误差', () => {
      const r = percent(0.1);
      expect(r.toDecimal()).toBe(0.001);
      expect(r.applyTo(1000)).toBe(1);
    });
  });
});
