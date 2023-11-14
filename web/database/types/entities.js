// @flow

export type Nullable<T> = {
  +value: T,
  +isNull: boolean,
};

export type NullableString = Nullable<string>;

export type NullableInt = Nullable<number>;
