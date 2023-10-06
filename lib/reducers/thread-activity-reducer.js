// @flow

import {
  deleteThreadActionTypes,
  leaveThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';
import { updateThreadLastNavigatedActionType } from '../types/thread-activity-types.js';
import { updateTypes } from '../types/update-types-enum.js';
import type { ClientUpdateInfo } from '../types/update-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

function reduceThreadActivity(
  state: ThreadActivityStore,
  action: BaseAction,
): ThreadActivityStore {
  if (action.type === updateThreadLastNavigatedActionType) {
    const { threadID, time } = action.payload;
    const updatedThreadActivityStore = {
      ...state,
      [threadID]: {
        ...state[threadID],
        lastNavigatedTo: time,
      },
    };
    return updatedThreadActivityStore;
  } else if (
    action.type === leaveThreadActionTypes.success ||
    action.type === deleteThreadActionTypes.success
  ) {
    const { newUpdates } = action.payload.updatesResult;
    if (newUpdates.length === 0) {
      return state;
    }

    let updatedState = { ...state };
    for (const update: ClientUpdateInfo of newUpdates) {
      if (update.type === updateTypes.DELETE_THREAD) {
        const { [update.threadID]: _, ...stateSansRemovedThread } =
          updatedState;
        updatedState = stateSansRemovedThread;
      }
    }
    return updatedState;
  } else if (
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {};
  }
  return state;
}

export { reduceThreadActivity };
