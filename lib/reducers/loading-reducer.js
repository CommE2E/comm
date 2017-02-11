// @flow

import type {
  BaseAppState,
  BaseAction,
} from '../types/redux-types';
import type { LoadingStatus } from '../types/loading-types';

import _ from 'lodash';
import invariant from 'invariant';

const fetchKeyRegistry: Set<string> = new Set();
const registerFetchKey = (fetchKey: string) => {
  fetchKeyRegistry.add(fetchKey);
};

function reduceLoadingStatuses<T: BaseAppState>(
  state: {[key: string]: {[idx: number]: LoadingStatus}},
  action: BaseAction<T>,
): {[key: string]: {[idx: number]: LoadingStatus}} {
  const startMatch = action.type.match(/(.*)_STARTED/);
  if (startMatch && fetchKeyRegistry.has(startMatch[1])) {
    invariant(
      action.loadingInfo && typeof action.loadingInfo === "object",
      "Flow can't handle regex",
    );
    const loadingInfo = action.loadingInfo;
    invariant(
      typeof loadingInfo.fetchIndex === "number",
      "Flow can't handle regex",
    );
    const keyName =
      loadingInfo.customKeyName && typeof loadingInfo.customKeyName === "string"
        ? loadingInfo.customKeyName
        : startMatch[1];
    if (loadingInfo.trackMultipleRequests) {
      return {
        ...state,
        [keyName]: {
          ...state[keyName],
          [loadingInfo.fetchIndex]: "loading",
        },
      };
    } else {
      return {
        ...state,
        [keyName]: {
          [loadingInfo.fetchIndex]: "loading",
        },
      };
    }
  }
  const failMatch = action.type.match(/(.*)_FAILED/);
  if (failMatch && fetchKeyRegistry.has(failMatch[1])) {
    invariant(
      action.loadingInfo && typeof action.loadingInfo === "object",
      "Flow can't handle regex",
    );
    const loadingInfo = action.loadingInfo;
    invariant(
      typeof loadingInfo.fetchIndex === "number",
      "Flow can't handle regex",
    );
    const keyName =
      loadingInfo.customKeyName && typeof loadingInfo.customKeyName === "string"
        ? loadingInfo.customKeyName
        : failMatch[1];
    if (state[keyName] && state[keyName][loadingInfo.fetchIndex]) {
      return {
        ...state,
        [keyName]: {
          ...state[keyName],
          [loadingInfo.fetchIndex]: "error",
        },
      };
    }
    return state;
  }
  const successMatch = action.type.match(/(.*)_SUCCESS/);
  if (successMatch && fetchKeyRegistry.has(successMatch[1])) {
    invariant(
      action.loadingInfo && typeof action.loadingInfo === "object",
      "Flow can't handle regex",
    );
    const loadingInfo = action.loadingInfo;
    invariant(
      typeof loadingInfo.fetchIndex === "number",
      "Flow can't handle regex",
    );
    const keyName =
      loadingInfo.customKeyName && typeof loadingInfo.customKeyName === "string"
        ? loadingInfo.customKeyName
        : successMatch[1];
    if (state[keyName] && state[keyName][loadingInfo.fetchIndex]) {
      const newKeyState = _.omit(
        state[keyName],
        [ loadingInfo.fetchIndex.toString() ],
      );
      return { ...state, [keyName]: newKeyState };
    }
  }
  return state;
}

export {
  reduceLoadingStatuses,
  registerFetchKey,
};
