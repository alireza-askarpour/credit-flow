import { isString } from '@app/common';

export const sanitizeText = ({ value }: { value: unknown }): unknown =>
  isString(value)
    ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim()
    : value;
