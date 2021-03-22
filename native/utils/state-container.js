// @flow

import type { Shape } from 'lib/types/core';

export type SimpleStateSetter<S: {}> = (
  newState: Shape<S>,
  callback?: () => mixed,
) => void;

export type StateChange<S: {}> = Shape<S> | (S => Shape<S>);
type StateSetter<S: {}> = (
  newState: StateChange<S>,
  callback?: () => mixed,
) => void;

export type StateContainer<S: {}> = {
  state: S,
  setState: SimpleStateSetter<S>,
};

function setStateForContainer<FullState: {}, OurContainer: {}>(
  setState: StateSetter<FullState>,
  reverseSelector: (ourChange: Shape<OurContainer>) => StateChange<FullState>,
): SimpleStateSetter<OurContainer> {
  return (ourChange: Shape<OurContainer>, callback?: () => mixed) =>
    setState(reverseSelector(ourChange), callback);
}

export { setStateForContainer };
