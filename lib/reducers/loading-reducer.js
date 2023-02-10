// @flow

import _omit from 'lodash/fp/omit.js';

import type { LoadingStatus } from '../types/loading-types.js';
import type { BaseAction } from '../types/redux-types.js';
import type { ActionTypes } from '../utils/action-utils.js';

const fetchKeyRegistry: Set<string> = new Set();
const registerFetchKey = (actionTypes: ActionTypes<*, *, *>) => {
  fetchKeyRegistry.add(actionTypes.started);
  fetchKeyRegistry.add(actionTypes.success);
  fetchKeyRegistry.add(actionTypes.failed);
};

function reduceLoadingStatuses(
  state: { [key: string]: { [idx: number]: LoadingStatus } },
  action: BaseAction,
): { [key: string]: { [idx: number]: LoadingStatus } } {
  const startMatch = action.type.match(/(.*)_STARTED/);
  if (startMatch && fetchKeyRegistry.has(action.type)) {
    if (!action.loadingInfo || typeof action.loadingInfo !== 'object') {
      return state;
    }
    const { loadingInfo } = action;
    if (typeof loadingInfo.fetchIndex !== 'number') {
      return state;
    }
    const keyName: string =
      loadingInfo.customKeyName && typeof loadingInfo.customKeyName === 'string'
        ? loadingInfo.customKeyName
        : startMatch[1];
    if (loadingInfo.trackMultipleRequests) {
      return {
        ...state,
        [keyName]: {
          ...state[keyName],
          [loadingInfo.fetchIndex]: 'loading',
        },
      };
    } else {
      return {
        ...state,
        [keyName]: {
          [loadingInfo.fetchIndex]: 'loading',
        },
      };
    }
  }
  const failMatch = action.type.match(/(.*)_FAILED/);
  if (failMatch && fetchKeyRegistry.has(action.type)) {
    if (!action.loadingInfo || typeof action.loadingInfo !== 'object') {
      return state;
    }
    const { loadingInfo } = action;
    if (typeof loadingInfo.fetchIndex !== 'number') {
      return state;
    }
    const keyName: string =
      loadingInfo.customKeyName && typeof loadingInfo.customKeyName === 'string'
        ? loadingInfo.customKeyName
        : failMatch[1];
    if (state[keyName] && state[keyName][loadingInfo.fetchIndex]) {
      return {
        ...state,
        [keyName]: {
          ...state[keyName],
          [loadingInfo.fetchIndex]: 'error',
        },
      };
    }
    return state;
  }
  const successMatch = action.type.match(/(.*)_SUCCESS/);
  if (successMatch && fetchKeyRegistry.has(action.type)) {
    if (!action.loadingInfo || typeof action.loadingInfo !== 'object') {
      return state;
    }
    const { loadingInfo } = action;
    if (typeof loadingInfo.fetchIndex !== 'number') {
      return state;
    }
    const keyName: string =
      loadingInfo.customKeyName && typeof loadingInfo.customKeyName === 'string'
        ? loadingInfo.customKeyName
        : successMatch[1];
    if (state[keyName] && state[keyName][loadingInfo.fetchIndex]) {
      const newKeyState = _omit([loadingInfo.fetchIndex.toString()])(
        state[keyName],
      );
      return { ...state, [keyName]: newKeyState };
    }
  }
  return state;
}

export { reduceLoadingStatuses, registerFetchKey };
