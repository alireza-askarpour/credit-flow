export const sanitizeText = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string'
    ? value.replace(/[\u0000-\u001F\u007F]/g, '').trim()
    : value;
