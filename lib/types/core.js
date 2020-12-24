// @flow

export type Shape<O> = $ReadOnly<$Rest<O, { ... }>>;
