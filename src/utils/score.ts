export type ScoreTier = 'good' | 'mid' | 'bad'

/** 权益评分分档：配色语义的唯一来源，避免各视图各自定义阈值 */
export function scoreTier(v: number): ScoreTier {
  return v >= 80 ? 'good' : v >= 40 ? 'mid' : 'bad'
}

export function scoreLevel(v: number): string {
  return v >= 80 ? '保障良好' : v >= 60 ? '基本保障' : v >= 40 ? '保障不足' : '严重缺失'
}

export const TIER_COLORS: Record<ScoreTier, string> = {
  good: '#059669',
  mid: '#d97706',
  bad: '#dc2626',
}
