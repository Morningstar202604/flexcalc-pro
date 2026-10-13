/**
 * 类型收窄守卫
 * 提供运行时类型检查与收窄，配合 TypeScript 类型系统实现类型安全
 * @packageDocumentation
 */

/** 判断是否为有限数字（非 NaN、非 Infinity） */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** 判断是否为整数 */
export function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

/** 判断是否为安全整数（-2^53+1 到 2^53-1） */
export function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** 判断是否为 NaN */
export function isNaNValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isNaN(value);
}

/** 判断是否为正数（> 0） */
export function isPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

/** 判断是否为负数（< 0） */
export function isNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value < 0;
}

/** 判断是否为非负数（>= 0） */
export function isNonNegativeNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

/** 判断是否为非正数（<= 0） */
export function isNonPositiveNumber(value: unknown): value is number {
  return isFiniteNumber(value) && value <= 0;
}

/** 判断是否为非空字符串 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** 判断是否为空字符串 */
export function isEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length === 0;
}

/** 判断是否为非空数组 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/** 判断是否为空数组 */
export function isEmptyArray(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
}

/** 判断是否为数组（可选元素类型守卫） */
export function isArray<T>(value: unknown, elementGuard?: (v: unknown) => v is T): value is T[] {
  if (!Array.isArray(value)) return false;
  if (!elementGuard) return true;
  return value.every(elementGuard);
}

/** 判断是否为对象（非 null、非数组、非原始值） */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** 判断是否为 null 或 undefined */
export function isNil(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/** 判断是否非 null/undefined */
export function isNotNil<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/** 判断是否为函数 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

/** 判断是否为 Promise */
export function isPromise<T>(value: unknown): value is Promise<T> {
  return value !== null && typeof value === 'object' && 'then' in value && isFunction((value as any).then);
}

/** 判断是否为 Date 且有效 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/** 判断是否为 RegExp */
export function isRegExp(value: unknown): value is RegExp {
  return value instanceof RegExp;
}

/** 判断是否为 Error */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/** 判断是否为类数组对象 */
export function isArrayLike(value: unknown): value is { length: number } {
  return value !== null && typeof value === 'object' && 'length' in value && isFiniteNumber((value as any).length);
}

/** 创建元组守卫 */
export function isTuple<T extends readonly unknown[]>(
  value: unknown,
  ...guards: { [K in keyof T]: (v: unknown) => v is T[K] }
): value is T {
  if (!Array.isArray(value)) return false;
  if (value.length !== guards.length) return false;
  return value.every((v, i) => guards[i](v));
}

/** 创建联合类型守卫 */
export function isUnion<T>(value: unknown, ...guards: ((v: unknown) => v is T)[]): value is T {
  return guards.some((g) => g(value));
}

/** 创建枚举值守卫 */
export function isEnumValue<T extends string | number>(enumObj: Record<string, T>): (value: unknown) => value is T {
  const values = new Set(Object.values(enumObj));
  return (value: unknown): value is T => values.has(value as T);
}

/** 创建字面量类型守卫 */
export function isLiteral<T extends string | number | boolean>(...literals: T[]): (value: unknown) => value is T {
  const set = new Set(literals);
  return (value: unknown): value is T => set.has(value as T);
}

/** 创建范围守卫（数字） */
export function isInRange(min: number, max: number, inclusive = true): (value: unknown) => value is number {
  return (value: unknown): value is number => {
    if (!isFiniteNumber(value)) return false;
    return inclusive ? value >= min && value <= max : value > min && value < max;
  };
}

/** 创建字符串长度守卫 */
export function hasLength(min: number, max?: number): (value: unknown) => value is string {
  return (value: unknown): value is string => {
    if (!isNonEmptyString(value)) return false;
    if (max !== undefined) return value.length >= min && value.length <= max;
    return value.length >= min;
  };
}

/** 创建数组长度守卫 */
export function hasArrayLength<T>(min: number, max?: number): (value: unknown) => value is T[] {
  return (value: unknown): value is T[] => {
    if (!isNonEmptyArray(value)) return false;
    if (max !== undefined) return value.length >= min && value.length <= max;
    return value.length >= min;
  };
}

/** 创建对象属性存在守卫 */
export function hasProperty<K extends string>(key: K): (value: unknown) => value is Record<K, unknown> {
  return (value: unknown): value is Record<K, unknown> => {
    return isPlainObject(value) && key in value;
  };
}

/** 创建对象属性类型守卫 */
export function hasPropertyOfType<K extends string, T>(
  key: K,
  guard: (v: unknown) => v is T
): (value: unknown) => value is Record<K, T> {
  return (value: unknown): value is Record<K, T> => {
    if (!isPlainObject(value)) return false;
    if (!(key in value)) return false;
    return guard(value[key]);
  };
}

/** 创建键值对守卫 */
export function isRecord<K extends string, V>(
  value: unknown,
  keyGuard: (k: unknown) => k is K,
  valueGuard: (v: unknown) => v is V
): value is Record<K, V> {
  if (!isPlainObject(value)) return false;
  return Object.entries(value).every(([k, v]) => keyGuard(k) && valueGuard(v));
}

/** 深度冻结对象（运行时不可变） */
export function deepFreeze<T>(obj: T): T {
  if (!isPlainObject(obj) && !Array.isArray(obj)) return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = (obj as any)[key];
    if ((isPlainObject(value) || Array.isArray(value)) && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

/** 类型断言（开发环境检查，生产环境无开销） */
export function assertType<T>(value: unknown, guard: (v: unknown) => v is T, message?: string): asserts value is T {
  if (!guard(value)) {
    throw new Error(message ?? `Type assertion failed: expected ${value} to pass`);
  }
}

/** 类型断言函数工厂 */
export function createAsserter<T>(guard: (v: unknown) => v is T, message?: string): (value: unknown) => asserts value is T {
  return (value: unknown): asserts value is T => assertType(value, guard, message);
}

/** 常用断言器 */
export const assertFiniteNumber = createAsserter(isFiniteNumber, 'Expected finite number');
export const assertNonEmptyString = createAsserter(isNonEmptyString, 'Expected non-empty string');
export const assertNonEmptyArray = createAsserter(isNonEmptyArray, 'Expected non-empty array');
export const assertValidDate = createAsserter(isValidDate, 'Expected valid Date');
export const assertPlainObject = createAsserter(isPlainObject, 'Expected plain object');
export const assertNotNil = createAsserter(isNotNil, 'Expected non-null/undefined value');

/** 类型收窄工具类型 */
export type Guard<T> = (value: unknown) => value is T;

/** 从守卫推导类型 */
export type InferGuard<G> = G extends Guard<infer T> ? T : never;

/** 组合多个守卫为交集类型 */
export function intersectGuards<T>(...guards: Guard<T>[]): Guard<T> {
  return (value: unknown): value is T => guards.every((g) => g(value));
}

/** 组合多个守卫为联合类型 */
export function unionGuards<T>(...guards: Guard<T>[]): Guard<T> {
  return (value: unknown): value is T => guards.some((g) => g(value));
}

/** 反转守卫 */
export function notGuard<T>(guard: Guard<T>): (value: unknown) => value is Exclude<unknown, T> {
  return (value: unknown): value is Exclude<unknown, T> => !guard(value);
}
