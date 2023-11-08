// @flow

// Flow 0.217 introduces React.RefSetter
export type ReactRefSetter<I> =
  | { current: null | I, ... }
  | ((null | I) => mixed);
