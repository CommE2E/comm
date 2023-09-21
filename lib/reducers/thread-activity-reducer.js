// @flow

import type { BaseAction } from '../types/redux-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';

export const updateThreadLastNavigatedActionType =
  'UPDATE_THREAD_LAST_NAVIGATED';

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
  }
  return state;
}

export { reduceThreadActivity };
