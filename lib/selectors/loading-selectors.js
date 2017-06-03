// @flow

import type { BaseAppState } from '../types/redux-types';
import type { LoadingStatus } from '../types/loading-types';
import type { ActionTypes } from '../utils/action-utils';

import { createSelector } from 'reselect';
import _isEmpty from 'lodash/fp/isEmpty';
import _includes from 'lodash/fp/includes';
import _memoize from 'lodash/memoize';

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

const baseCreateLoadingStatusSelector = (
  actionTypes: ActionTypes<*, *, *>,
  overrideKey?: string,
) => {
  // This makes sure that reduceLoadingStatuses tracks this action
  registerFetchKey(actionTypes);
  // This is the key used to store the Promise state in Redux
  const trackingKey = overrideKey ? overrideKey : actionTypes.started;
  return createSelector(
    (state: BaseAppState) => state.loadingStatuses[trackingKey],
    (loadingStatusInfo: {[idx: number]: LoadingStatus}) =>
      loadingStatusFromInfo(loadingStatusInfo),
  );
};

const createLoadingStatusSelector = _memoize(
  baseCreateLoadingStatusSelector,
  (actionTypes: ActionTypes<*, *, *>, overrideKey: ?string) =>
    overrideKey ? overrideKey : actionTypes.started,
);

const globalLoadingStatusSelector = createSelector(
  (state: BaseAppState) => state.loadingStatuses,
  (
    loadingStatusInfos: {[key: string]: {[idx: number]: LoadingStatus}},
  ): LoadingStatus => {
    let errorExists = false;
    for (const idx in loadingStatusInfos) {
      const loadingStatus = loadingStatusFromInfo(loadingStatusInfos[idx]);
      if (loadingStatus === "loading") {
        return "loading";
      }
      if (loadingStatus === "error") {
        errorExists = true;
      }
    }
    return errorExists ? "error" : "inactive";
  },
);

export {
  createLoadingStatusSelector,
  globalLoadingStatusSelector,
};
