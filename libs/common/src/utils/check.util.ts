import { objKeys } from './obj.util';

export const isUndefined = (value: unknown): value is undefined =>
  typeof value === 'undefined';

export const isNull = (value: unknown): value is null => value === null;

export const isNil = (value: unknown): value is null | undefined =>
  isUndefined(value) || isNull(value);

export const isString = (value: unknown): value is string =>
  typeof value === 'string';

export const hasLength = (value: readonly unknown[] | string): boolean =>
  value.length > 0;

export const isStringFull = (value: unknown): value is string =>
  isString(value) && hasLength(value);

export const isArrayFull = (value: unknown): value is unknown[] =>
  Array.isArray(value) && hasLength(value);

export const isArrayStrings = (value: unknown): value is string[] =>
  isArrayFull(value) && value.every((item) => isStringFull(item));

export const isObject = (value: unknown): value is object =>
  typeof value === 'object' && !isNull(value);

export const isObjectFull = (value: unknown): value is object =>
  isObject(value) && hasLength(objKeys(value));

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const isEqual = (value: unknown, expected: unknown): boolean =>
  value === expected;

export const isFalse = (value: unknown): value is false => value === false;

export const isTrue = (value: unknown): value is true => value === true;

export const isIn = (
  value: unknown,
  values: readonly unknown[] = [],
): boolean => values.some((item) => isEqual(value, item));

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean';

export const isNumeric = (value: unknown): boolean =>
  isString(value) && /^[+-]?([0-9]*[.])?[0-9]+$/.test(value);

export const isDateString = (value: unknown): value is string =>
  isStringFull(value) &&
  /^\d{4}-[01]\d-[0-3]\d(?:T[0-2]\d:[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[-+][0-2]\d(?::?[0-5]\d)?)?)?$/.test(
    value,
  );

export const isDate = (value: unknown): value is Date => value instanceof Date;

export const isValue = (value: unknown): boolean =>
  isStringFull(value) || isNumber(value) || isBoolean(value) || isDate(value);

export const hasValue = (value: unknown): boolean =>
  isArrayFull(value) ? value.every((item) => isValue(item)) : isValue(value);

export const isFunction = (
  value: unknown,
): value is (...args: unknown[]) => unknown => typeof value === 'function';
