/**
 * 个人账户养老金计发月数（国发〔2005〕38号附表，按退休年龄查表）。
 * 只收录可核实的法定锚点值；未知年龄落在区间内取「不超过该年龄的最大锚点」，
 * 月数偏大 → 个账养老金偏小，方向上保守。无法定位时回落 60 岁口径 139。
 */

export const ISSUANCE_MONTHS: readonly [number, number][] = [
  [40, 233],
  [45, 216],
  [50, 195],
  [55, 170],
  [60, 139],
  [65, 101],
  [70, 56],
]

export const DEFAULT_ISSUANCE_MONTHS = 139

export function issuanceMonthsForAge(retireAge: number): number {
  if (!Number.isFinite(retireAge)) return DEFAULT_ISSUANCE_MONTHS
  let months = DEFAULT_ISSUANCE_MONTHS
  for (const [age, m] of ISSUANCE_MONTHS) {
    if (retireAge >= age) months = m
  }
  return months
}
