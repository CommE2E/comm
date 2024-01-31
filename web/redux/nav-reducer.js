// @flow

import { pendingToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors.js';
import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { RawThreadInfos } from 'lib/types/thread-types.js';

import { updateNavInfoActionType } from '../redux/action-types.js';
import type { Action } from '../redux/redux-setup.js';
import { type WebNavInfo } from '../types/nav-types.js';

export default function reduceNavInfo(
  oldState: WebNavInfo,
  action: Action,
  newThreadInfos: RawThreadInfos,
): WebNavInfo {
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
