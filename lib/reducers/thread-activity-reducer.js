// @flow

import { ensureRealizedThreadIDIsUsedWhenPossible } from './message-reducer.js';
import {
  sendMultimediaMessageActionTypes,
  sendReactionMessageActionTypes,
  sendTextMessageActionTypes,
} from '../actions/message-actions.js';
import {
  logOutActionTypes,
  deleteAccountActionTypes,
} from '../actions/user-actions.js';
import type { BaseAction } from '../types/redux-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';
import { updateThreadLastNavigatedActionType } from '../types/thread-activity-types.js';
import type { RawThreadInfo } from '../types/thread-types.js';
import { setNewSessionActionType } from '../utils/action-utils.js';

function reduceThreadActivity(
  state: ThreadActivityStore,
  action: BaseAction,
  newThreadInfos: { +[id: string]: RawThreadInfo },
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
    action.type === sendTextMessageActionTypes.started ||
    action.type === sendMultimediaMessageActionTypes.started ||
    action.type === sendReactionMessageActionTypes.started
  ) {
    const payload = ensureRealizedThreadIDIsUsedWhenPossible(
      action.payload,
      newThreadInfos,
    );
    const { threadID } = payload;
    const now = Date.now();

    return {
      ...state,
      [threadID]: {
        lastNavigatedTo: state[threadID]?.lastNavigatedTo ?? now,
        lastPruned: state[threadID]?.lastPruned ?? now,
      },
    };
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
