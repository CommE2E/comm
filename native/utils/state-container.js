// @flow

type SimpleStateSetter<S: { ... }> = (
  newState: Partial<S>,
  callback?: () => mixed,
) => void;

export type StateChange<S: { ... }> = Partial<S> | (S => Partial<S>);

export type StateContainer<S: { ... }> = {
  state: S,
  setState: SimpleStateSetter<S>,
};
