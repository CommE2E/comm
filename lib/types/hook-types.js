// @flow

export type SetState<T> = ((T => T) | T) => void;
