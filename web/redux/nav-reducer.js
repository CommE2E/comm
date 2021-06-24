// @flow

import { pendingToRealizedThreadIDsSelector } from 'lib/selectors/thread-selectors';
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
    const pendingToRealizedThreadIDs = pendingToRealizedThreadIDsSelector(
      newThreadInfos,
    );
    const realizedThreadID = pendingToRealizedThreadIDs.get(activeChatThreadID);
    if (realizedThreadID) {
      state = {
        ...state,
        activeChatThreadID: realizedThreadID,
      };
    }
  }

  return state;
}
