// @flow

import type {
  Dispatch,
  UpdateCallback,
  BaseAppState,
} from '../types/redux-types';

function mapStateToUpdateStore<T: BaseAppState, A>(
  dispatch: Dispatch<T, A>,
) {
  return {
    updateStore: (callback: UpdateCallback<T>) =>
      dispatch({ type: "GENERIC", callback }),
  };
}

export { mapStateToUpdateStore }
