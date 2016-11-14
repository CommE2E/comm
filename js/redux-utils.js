// @flow

import type { Action, UpdateStore, UpdateCallback } from './redux-reducer';

function genericActionCreator(dispatch: (action: Action) => void): UpdateStore {
  return (callback: UpdateCallback) => {
    dispatch({ type: "GENERIC", callback });
  };
}

function mapStateToUpdateStore(dispatch: (action: Action) => void) {
  return {
    updateStore: genericActionCreator(dispatch),
  };
}

export { mapStateToUpdateStore }
