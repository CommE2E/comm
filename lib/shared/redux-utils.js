// @flow

import type {
  Action,
  UpdateStore,
  UpdateCallback,
  BaseAppState,
  BaseNavInfo,
} from '../model/redux-reducer';

function genericActionCreator<U: BaseNavInfo, T: BaseAppState<U>>(
  dispatch: (action: Action<U, T>) => void,
): UpdateStore<U, T> {
  return (callback: UpdateCallback<U, T>) => {
    dispatch({ type: "GENERIC", callback });
  };
}

function mapStateToUpdateStore<U: BaseNavInfo, T: BaseAppState<U>>(
  dispatch: (action: Action<U, T>) => void,
) {
  const updateStore: UpdateStore<U, T> = genericActionCreator(dispatch);
  return { updateStore };
}

export { mapStateToUpdateStore }
