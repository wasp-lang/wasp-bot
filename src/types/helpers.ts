export type Writable<T> = {
  -readonly [K in keyof T]: T[K];
};

export type DeepWritable<T> = {
  -readonly [K in keyof T]: DeepWritable<T[K]>;
};
