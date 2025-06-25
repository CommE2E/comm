// @flow

function resetUserSpecificState<T: { +[string]: mixed }>(
  state: T,
  defaultState: T,
  nonUserSpecificFields: $ReadOnlyArray<string>,
): T {
  let newState: T = { ...defaultState };
  for (const field of nonUserSpecificFields) {
    newState = {
      ...newState,
      [field]: state[field],
    };
  }
  return newState;
}

export { resetUserSpecificState };
