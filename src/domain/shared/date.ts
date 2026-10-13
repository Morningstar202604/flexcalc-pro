/**
 * Date 值对象：YearMonth、DateRange
 * 日期相关运算的不可变值对象
 * @packageDocumentation
 */

/** 年月值对象：YYYY-MM 格式，不可变 */
export class YearMonth {
  public readonly year: number;
  public readonly month: number; // 1-12

  private constructor(year: number, month: number) {
    this.year = year;
    this.month = month;
  }

  /** 从年月创建 */
  static create(year: number, month: number): YearMonth {
    if (!Number.isInteger(year) || !Number.isInteger(month)) {
      throw new Error(`Year and month must be integers, got: ${year}, ${month}`);
    }
    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}. Must be 1-12.`);
    }
    if (year < 1900 || year > 2100) {
      throw new Error(`Year out of supported range: ${year}. Must be 1900-2100.`);
    }
    return new YearMonth(year, month);
  }

  /** 从 Date 创建 */
  static fromDate(date: Date): YearMonth {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid Date object');
    }
    return YearMonth.create(date.getFullYear(), date.getMonth() + 1);
  }

  /** 从 ISO 字符串创建（YYYY-MM 或 YYYY-MM-DD） */
  static fromString(str: string): YearMonth {
    const match = str.match(/^(\d{4})-(\d{2})/);
    if (!match) {
      throw new Error(`Invalid YearMonth string: ${str}. Expected YYYY-MM format.`);
    }
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    return YearMonth.create(year, month);
  }

  /** 当前年月 */
  static now(): YearMonth {
    return YearMonth.fromDate(new Date());
  }

  /** 加月份 */
  addMonths(months: number): YearMonth {
    if (!Number.isInteger(months)) {
      throw new Error('Months must be an integer');
    }
    let totalMonths = this.year * 12 + (this.month - 1) + months;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = (totalMonths % 12) + 1;
    return YearMonth.create(newYear, newMonth);
  }

  /** 减月份 */
  subtractMonths(months: number): YearMonth {
    return this.addMonths(-months);
  }

  /** 月份差（this - other） */
  diffMonths(other: YearMonth): number {
    return (this.year - other.year) * 12 + (this.month - other.month);
  }

  /** 下个月 */
  nextMonth(): YearMonth {
    return this.addMonths(1);
  }

  /** 上个月 */
  prevMonth(): YearMonth {
    return this.subtractMonths(1);
  }

  /** 比较：是否早于 */
  isBefore(other: YearMonth): boolean {
    if (this.year !== other.year) return this.year < other.year;
    return this.month < other.month;
  }

  /** 比较：是否早于或等于 */
  isBeforeOrEqual(other: YearMonth): boolean {
    return this.isBefore(other) || this.equals(other);
  }

  /** 比较：是否晚于 */
  isAfter(other: YearMonth): boolean {
    return other.isBefore(this);
  }

  /** 比较：是否晚于或等于 */
  isAfterOrEqual(other: YearMonth): boolean {
    return other.isBeforeOrEqual(this);
  }

  /** 相等比较 */
  equals(other: YearMonth): boolean {
    return this.year === other.year && this.month === other.month;
  }

  /** 转为 ISO 字符串 YYYY-MM */
  toISOString(): string {
    return `${this.year}-${this.month.toString().padStart(2, '0')}`;
  }

  /** 转为 Date 对象（月初 00:00:00） */
  toDate(): Date {
    return new Date(this.year, this.month - 1, 1);
  }

  /** 转为字符串 YYYY-MM */
  toString(): string {
    return this.toISOString();
  }
}

/** 日期范围值对象 */
export class DateRange {
  public readonly start: Date;
  public readonly end: Date;

  private constructor(start: Date, end: Date) {
    this.start = start;
    this.end = end;
  }

  /** 创建日期范围 */
  static create(start: Date, end: Date): DateRange {
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new Error('Start date must be a valid Date');
    }
    if (!(end instanceof Date) || isNaN(end.getTime())) {
      throw new Error('End date must be a valid Date');
    }
    if (start > end) {
      throw new Error('Start date must be before or equal to end date');
    }
    return new DateRange(start, end);
  }

  /** 从 YearMonth 创建（含首尾日） */
  static fromYearMonth(ym: import('./date').YearMonth): DateRange {
    const start = ym.toDate();
    const end = new Date(ym.year, ym.month, 0, 23, 59, 59, 999);
    return new DateRange(start, end);
  }

  /** 包含某日期 */
  contains(date: Date): boolean {
    return date >= this.start && date <= this.end;
  }

  /** 天数差（含首尾） */
  days(): number {
    const diff = this.end.getTime() - this.start.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  /** 月数差（近似） */
  months(): number {
    return (this.end.getFullYear() - this.start.getFullYear()) * 12 + (this.end.getMonth() - this.start.getMonth());
  }

  /** 相等比较 */
  equals(other: DateRange): boolean {
    return this.start.getTime() === other.start.getTime() && this.end.getTime() === other.end.getTime();
  }

  toString(): string {
    return `${this.start.toISOString().split('T')[0]} ~ ${this.end.toISOString().split('T')[0]}`;
  }
}