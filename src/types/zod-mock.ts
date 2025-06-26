// Temporary mock for zod
export const z = {
  object: (schema) => ({
    parse: (data) => data,
    shape: schema
  }),
  string: () => ({ parse: (v) => v }),
  number: () => ({ parse: (v) => v }),
  boolean: () => ({ parse: (v) => v }),
  array: (schema) => ({ parse: (v) => v }),
  optional: (schema) => schema,
  default: (schema, defaultValue) => schema,
  enum: (values) => ({ parse: (v) => v }),
  record: (key, value) => ({ parse: (v) => v }),
  union: (schemas) => ({ parse: (v) => v }),
  effects: (schema, fn) => schema,
  infer: (schema) => ({})
};

export type infer<T> = any;
