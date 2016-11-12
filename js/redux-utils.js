// @flow

import type {
  AppState,
  Action,
  UpdateStore,
  UpdateCallback,
} from './redux-reducer';

function mapStateToPropsByName(props: Array<string>) {
  return (state: AppState) => {
    const mapObj = {};
    for (const prop of props) {
      mapObj[prop] = state[prop];
    }
    return mapObj;
  };
}

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

export { mapStateToPropsByName, mapStateToUpdateStore }
