// @flow

import type {
  Action,
  UpdateStore,
  UpdateCallback,
  BaseAppState,
} from '../model/redux-reducer';

function genericActionCreator<T: BaseAppState>(
  dispatch: (action: Action<T>) => void,
): UpdateStore<T> {
  return (callback: UpdateCallback<T>) => {
    dispatch({ type: "GENERIC", callback });
  };
}

function mapStateToUpdateStore<T: BaseAppState>(
  dispatch: (action: Action<T>) => void,
) {
  const updateStore: UpdateStore<T> = genericActionCreator(dispatch);
  return { updateStore };
}

export { mapStateToUpdateStore }
