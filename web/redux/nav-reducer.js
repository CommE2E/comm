// @flow

import { locallyUniqueToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors';
import { threadIsPending } from 'lib/shared/thread-utils';
import type { RawThreadInfo } from 'lib/types/thread-types';

import type { Action } from '../redux/redux-setup';
import { type NavInfo, updateNavInfoActionType } from '../types/nav-types';

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
    const locallyUniqueToRealizedThreadIDs = locallyUniqueToRealizedThreadIDsSelector(
      newThreadInfos,
    );
    const realizedThreadID = locallyUniqueToRealizedThreadIDs.get(
      activeChatThreadID,
    );
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
