// @flow

import type { BaseAppState } from '../types/redux-types';
import type { LoadingStatus } from '../types/loading-types';

import { createSelector } from 'reselect';
import _ from 'lodash';

import { registerFetchKey } from '../reducers/loading-reducer';

const baseCreateLoadingStatusSelector = (key: string) => {
  registerFetchKey(key);
  return createSelector(
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
};

const createLoadingStatusSelector = _.memoize(baseCreateLoadingStatusSelector);

export {
  createLoadingStatusSelector,
};
