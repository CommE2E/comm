// @flow

export type Shape<O> = $ReadOnly<$Rest<O, { ... }>>;

export type OnClick = (event: SyntheticEvent<HTMLButtonElement>) => mixed;
