// @flow

import type { BaseAppState } from '../types/redux-types';
import type { LoadingStatus } from '../types/loading-types';
import type { ActionTypes } from '../utils/action-utils';

import { createSelector } from 'reselect';
import _isEmpty from 'lodash/fp/isEmpty';
import _includes from 'lodash/fp/includes';
import _memoize from 'lodash/memoize';
import invariant from 'invariant';

import { registerFetchKey } from '../reducers/loading-reducer';

function loadingStatusFromInfo(
  loadingStatusInfo: {[idx: number]: LoadingStatus},
): LoadingStatus {
  if (_isEmpty(loadingStatusInfo)) {
    return "inactive";
  } else if (_includes("error")(loadingStatusInfo)) {
    return "error";
  } else {
    return "loading";
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
    "actionTypes.started should always end with _STARTED",
  );
  return startMatch[1];
}

const baseCreateLoadingStatusSelector = (
  actionTypes: ActionTypes<*, *, *>,
  overrideKey?: string,
) => {
  // This makes sure that reduceLoadingStatuses tracks this action
  registerFetchKey(actionTypes);
  const trackingKey = getTrackingKey(actionTypes, overrideKey);
  return createSelector(
    (state: BaseAppState<*>) => state.loadingStatuses[trackingKey],
    (loadingStatusInfo: {[idx: number]: LoadingStatus}) =>
      loadingStatusFromInfo(loadingStatusInfo),
  );
};

const createLoadingStatusSelector = _memoize(
  baseCreateLoadingStatusSelector,
  getTrackingKey,
);

function combineLoadingStatuses(
  ...loadingStatuses: $ReadOnlyArray<LoadingStatus>
): LoadingStatus {
  let errorExists = false;
  for (let loadingStatus of loadingStatuses) {
    if (loadingStatus === "loading") {
      return "loading";
    }
    if (loadingStatus === "error") {
      errorExists = true;
    }
  }
  return errorExists ? "error" : "inactive";
}

const globalLoadingStatusSelector = createSelector(
  (state: BaseAppState<*>) => state.loadingStatuses,
  (
    loadingStatusInfos: {[key: string]: {[idx: number]: LoadingStatus}},
  ): LoadingStatus => {
    const loadingStatusInfoValues = (
      (Object.values(loadingStatusInfos): any):
        $ReadOnlyArray<{[idx: number]: LoadingStatus}>
    );
    const loadingStatuses = loadingStatusInfoValues.map(loadingStatusFromInfo);
    return combineLoadingStatuses(...loadingStatuses);
  },
);

export {
  createLoadingStatusSelector,
  globalLoadingStatusSelector,
  combineLoadingStatuses,
};
