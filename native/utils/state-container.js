// @flow

type SimpleStateSetter<S: { ... }> = (
  newState: Partial<S>,
  callback?: () => mixed,
) => void;

export type StateContainer<S: { ... }> = {
  state: S,
  setState: SimpleStateSetter<S>,
};
