export const objKeys = (value: object): string[] => Object.keys(value);

export const getOwnPropNames = (value: object): string[] =>
  Object.getOwnPropertyNames(value);
