export type { EChartsOption } from 'echarts'

/**
 * 金额统一保留两位小数。
 * 早期四处引擎各自实现 Math.round(n*100)/100，对负数半值向 +∞ 取整
 * （round(-1.005) = -1），且存在 -0 与浮点误差，这里统一处理。
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0
  // 先做 EPS 补偿消除 1.005 这类二进制表示误差，再用 sign 还原负数的向 -∞ 取整
  const scaled = n * 100
  const fixed = Math.abs(scaled) < 1e-9 ? 0 : Math.round(Math.abs(scaled) + Number.EPSILON * Math.abs(scaled))
  return (n < 0 ? -fixed : fixed) / 100
}