// @flow

import type { BaseAction } from '../types/redux-types';

import _difference from 'lodash/fp/difference';

import {
  logInActionTypes,
  resetPasswordActionTypes,
} from '../actions/user-actions';
import { pingActionTypes } from '../actions/ping-actions';
import threadWatcher from '../shared/thread-watcher';

function reduceCurrentAsOf(
  currentAsOf: number,
  action: BaseAction,
): number {
  if (
    action.type !== logInActionTypes.success &&
      action.type !== resetPasswordActionTypes.success &&
      action.type !== pingActionTypes.success
  ) {
    return currentAsOf;
  }
  const oldWatchedIDs = action.payload.messagesResult.watchedIDsAtRequestTime;
  const currentWatchedIDs = threadWatcher.getWatchedIDs();
  if (_difference(currentWatchedIDs)(oldWatchedIDs).length !== 0) {
    // This indicates that we have had a new watched ID since this query was
    // issued. As a result this query does not update the new watched ID to be
    // "current as of" the new time here, and thus we cannot advance the value
    // in Redux. The next ping might consequently include duplicates, but
    // reduceMessageStore should be able to handle that.
    return currentAsOf;
  }
  return action.payload.messagesResult.serverTime;
}

export default reduceCurrentAsOf;
