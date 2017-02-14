// @flow

import type { BaseAppState } from '../types/redux-types';
import type { LoadingStatus } from '../types/loading-types';

import { createSelector } from 'reselect';
import _isEmpty from 'lodash/fp/isEmpty';
import _includes from 'lodash/fp/includes';
import _memoize from 'lodash/memoize';

import { registerFetchKey } from '../reducers/loading-reducer';

const baseCreateLoadingStatusSelector = (key: string, overrideKey?: string) => {
  // This makes sure that reduceLoadingStatuses tracks this action key
  registerFetchKey(key);
  // This is the key used to store the Promise state in Redux
  const trackingKey = overrideKey ? overrideKey : key;
  return createSelector(
    (state: BaseAppState) => state.loadingStatuses[trackingKey],
    (loadingStatusInfo: {[idx: number]: LoadingStatus}): LoadingStatus => {
      if (_isEmpty(loadingStatusInfo)) {
        return "inactive";
      } else if (_includes("error")(loadingStatusInfo)) {
        return "error";
      } else {
        return "loading";
      }
    },
  );
};

const createLoadingStatusSelector = _memoize(
  baseCreateLoadingStatusSelector,
  (key: string, overrideKey: ?string) => overrideKey ? overrideKey : key,
);

export {
  createLoadingStatusSelector,
};
