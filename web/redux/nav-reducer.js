// @flow

import { pendingToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { RawThreadInfo } from 'lib/types/thread-types.js';

import { updateNavInfoActionType } from '../redux/action-types.js';
import type { Action } from '../redux/redux-setup.js';
import { type NavInfo } from '../types/nav-types.js';

export default function reduceNavInfo(
  oldState: NavInfo,
  action: Action,
  newThreadInfos: { +[id: string]: RawThreadInfo },
): NavInfo {
  let state = oldState;
  if (action.type === updateNavInfoActionType) {
    state = {
      ...state,
      ...action.payload,
    };
  }

  const { activeChatThreadID } = state;
  if (activeChatThreadID) {
    const pendingToRealizedThreadIDs =
      pendingToRealizedThreadIDsSelector(newThreadInfos);
    const realizedThreadID = pendingToRealizedThreadIDs.get(activeChatThreadID);
    if (realizedThreadID) {
      state = {
        ...state,
        activeChatThreadID: realizedThreadID,
      };
    }
  }

  if (state.pendingThread && !threadIsPending(state.activeChatThreadID)) {
    const { pendingThread, ...stateWithoutPendingThread } = state;
    state = stateWithoutPendingThread;
  }

  return state;
}
