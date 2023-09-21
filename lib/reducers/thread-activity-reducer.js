// @flow

import {
  leaveThreadActionTypes,
  deleteThreadActionTypes,
} from '../actions/thread-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';
import { updateThreadLastNavigatedActionType } from '../types/thread-activity-types.js';
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
    action.type === logOutActionTypes.success ||
    action.type === deleteAccountActionTypes.success ||
    action.type === deleteThreadActionTypes.success ||
    action.type === leaveThreadActionTypes.success ||
    (action.type === setNewSessionActionType &&
      action.payload.sessionChange.cookieInvalidated)
  ) {
    return {};
  }
  return state;
}

export { reduceThreadActivity };
