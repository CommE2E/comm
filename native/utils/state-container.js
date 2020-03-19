// @flow

import PropTypes from 'prop-types';

export type SimpleStateSetter<S: {}> = (
  newState: $Shape<S>,
  callback?: () => mixed,
) => void;

export type StateChange<S: {}> = $Shape<S> | (S => $Shape<S>);
type StateSetter<S: {}> = (
  newState: StateChange<S>,
  callback?: () => mixed,
) => void;

export type StateContainer<S: {}> = {
  state: S,
  setState: SimpleStateSetter<S>,
};

const stateContainerPropType = PropTypes.shape({
  state: PropTypes.object.isRequired,
  setState: PropTypes.func.isRequired,
});

function setStateForContainer<FullState: {}, OurContainer: {}>(
  setState: StateSetter<FullState>,
  reverseSelector: (ourChange: $Shape<OurContainer>) => StateChange<FullState>,
): SimpleStateSetter<OurContainer> {
  return (ourChange: $Shape<OurContainer>, callback?: () => mixed) =>
    setState(reverseSelector(ourChange), callback);
}

export { setStateForContainer, stateContainerPropType };
