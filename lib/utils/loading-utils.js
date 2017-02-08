// @flow

import type { BaseAppState, LoadingStatus } from '../model/redux-reducer';

import { createSelector } from 'reselect';
import _ from 'lodash';

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

export {
  createLoadingStatusSelector,
};
