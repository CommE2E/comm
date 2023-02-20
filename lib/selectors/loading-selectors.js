// @flow

import invariant from 'invariant';
import _includes from 'lodash/fp/includes.js';
import _isEmpty from 'lodash/fp/isEmpty.js';
import _memoize from 'lodash/memoize.js';
import { createSelector } from 'reselect';

import { registerFetchKey } from '../reducers/loading-reducer.js';
import type { LoadingStatus } from '../types/loading-types.js';
import type { BaseAppState } from '../types/redux-types.js';
import type { ActionTypes } from '../utils/action-utils.js';
import { values } from '../utils/objects.js';

function loadingStatusFromInfo(loadingStatusInfo: {
  [idx: number]: LoadingStatus,
}): LoadingStatus {
  if (_isEmpty(loadingStatusInfo)) {
    return 'inactive';
  } else if (_includes('error')(loadingStatusInfo)) {
    return 'error';
  } else {
    return 'loading';
  }
}

// This is the key used to store the Promise state in Redux
function getTrackingKey(
  actionTypes: ActionTypes<*, *, *>,
  overrideKey?: string,
) {
  if (overrideKey) {
    return overrideKey;
  }
  const startMatch = actionTypes.started.match(/(.*)_STARTED/);
  invariant(
    startMatch && startMatch[1],
    'actionTypes.started should always end with _STARTED',
  );
  return startMatch[1];
}

const baseCreateLoadingStatusSelector = (
  actionTypes: ActionTypes<*, *, *>,
  overrideKey?: string,
): ((state: BaseAppState<*>) => LoadingStatus) => {
  // This makes sure that reduceLoadingStatuses tracks this action
  registerFetchKey(actionTypes);
  const trackingKey = getTrackingKey(actionTypes, overrideKey);
  return createSelector(
    (state: BaseAppState<*>) => state.loadingStatuses[trackingKey],
    (loadingStatusInfo: { [idx: number]: LoadingStatus }) =>
      loadingStatusFromInfo(loadingStatusInfo),
  );
};

const createLoadingStatusSelector: (
  actionTypes: ActionTypes<*, *, *>,
  overrideKey?: string,
) => (state: BaseAppState<*>) => LoadingStatus = _memoize(
  baseCreateLoadingStatusSelector,
  getTrackingKey,
);

function combineLoadingStatuses(
  ...loadingStatuses: $ReadOnlyArray<LoadingStatus>
): LoadingStatus {
  let errorExists = false;
  for (const loadingStatus of loadingStatuses) {
    if (loadingStatus === 'loading') {
      return 'loading';
    }
    if (loadingStatus === 'error') {
      errorExists = true;
    }
  }
  return errorExists ? 'error' : 'inactive';
}

const globalLoadingStatusSelector: (state: BaseAppState<*>) => LoadingStatus =
  createSelector(
    (state: BaseAppState<*>) => state.loadingStatuses,
    (loadingStatusInfos: {
      [key: string]: { [idx: number]: LoadingStatus },
    }): LoadingStatus => {
      const loadingStatusInfoValues = values(loadingStatusInfos);
      const loadingStatuses = loadingStatusInfoValues.map(
        loadingStatusFromInfo,
      );
      return combineLoadingStatuses(...loadingStatuses);
    },
  );

export {
  createLoadingStatusSelector,
  globalLoadingStatusSelector,
  combineLoadingStatuses,
};
