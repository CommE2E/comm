// @flow

export type SimpleStateSetter<S: { ... }> = (
  newState: Partial<S>,
  callback?: () => mixed,
) => void;

export type StateChange<S: { ... }> = Partial<S> | (S => Partial<S>);
type StateSetter<S: { ... }> = (
  newState: StateChange<S>,
  callback?: () => mixed,
) => void;

export type StateContainer<S: { ... }> = {
  state: S,
  setState: SimpleStateSetter<S>,
};

function setStateForContainer<FullState: { ... }, OurContainer: { ... }>(
  setState: StateSetter<FullState>,
  reverseSelector: (ourChange: Partial<OurContainer>) => StateChange<FullState>,
): SimpleStateSetter<OurContainer> {
  return (ourChange: Partial<OurContainer>, callback?: () => mixed) =>
    setState(reverseSelector(ourChange), callback);
}

export { setStateForContainer };
