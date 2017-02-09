// @flow

import type {
  BaseAppState,
  LoadingStatus,
  BaseAction,
} from '../model/redux-reducer';

import { createSelector } from 'reselect';
import _ from 'lodash';
import invariant from 'invariant';

// This create a *new* selector when called. Call it only once for each key!
const createLoadingStatusSelector = (key: string) => createSelector(
  (state: BaseAppState) => state.loadingStatuses[key],
  (loadingStatusInfo: {[idx: number]: LoadingStatus}): LoadingStatus => {
    if (_.isEmpty(loadingStatusInfo)) {
      return "inactive";
    } else if (_.includes(loadingStatusInfo, "error")) {
      return "error";
    } else {
      return "loading";
    }
  },
);

const fetchKeyRegistry: Set<string> = new Set();
const registerFetchKey = (fetchKey: string) => {
  fetchKeyRegistry.add(fetchKey);
  return fetchKey;
};

function reduceLoadingStatuses<T: BaseAppState>(
  state: {[key: string]: {[idx: number]: LoadingStatus}},
  action: BaseAction<T>,
): {[key: string]: {[idx: number]: LoadingStatus}} {
  const startMatch = action.type.match(/(.*)_STARTED/);
  if (startMatch && fetchKeyRegistry.has(startMatch[1])) {
    invariant(
      action.onlyLatestRequestMatters !== undefined &&
        typeof action.fetchIndex === "number",
      "Flow can't handle regex",
    );
    const keyName = startMatch[1];
    if (action.onlyLatestRequestMatters) {
      return {
        ...state,
        [keyName]: {
          [action.fetchIndex]: "loading",
        },
      };
    } else {
      return {
        ...state,
        [keyName]: {
          ...state[keyName],
          [action.fetchIndex]: "loading",
        },
      };
    }
  }
  const failMatch = action.type.match(/(.*)_FAILED/);
  if (failMatch && fetchKeyRegistry.has(failMatch[1])) {
    invariant(typeof action.fetchIndex === "number", "Flow can't handle regex");
    const keyName = failMatch[1];
    if (state[keyName] && state[keyName][action.fetchIndex]) {
      return {
        ...state,
        [keyName]: {
          ...state[keyName],
          [action.fetchIndex]: "error",
        },
      };
    }
    return state;
  }
  const successMatch = action.type.match(/(.*)_SUCCESS/);
  if (successMatch && fetchKeyRegistry.has(successMatch[1])) {
    invariant(typeof action.fetchIndex === "number", "Flow can't handle regex");
    const keyName = successMatch[1];
    if (state[keyName] && state[keyName][action.fetchIndex]) {
      const newKeyState = _.omit(
        state[keyName],
        [ action.fetchIndex.toString() ],
      );
      return { ...state, [keyName]: newKeyState };
    }
  }
  return state;
}

export {
  createLoadingStatusSelector,
  reduceLoadingStatuses,
  registerFetchKey,
};
