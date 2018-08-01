// @flow

import type { AppState } from '../redux-setup';
import type { PingStartingPayload } from 'lib/types/ping-types';
import type { ThreadMessageInfo } from 'lib/types/message-types';

import { createSelector } from 'reselect';

import {
  pingStartingPayload,
  pingActionInput,
} from 'lib/selectors/ping-selectors';
import { pingActionInputSelector } from 'lib/shared/ping-utils';

import { activeThreadSelector } from './nav-selectors';

// On native we include messageStorePruneRequest
const msInHour = 60 * 60 * 1000;
const pingNativeStartingPayload = createSelector(
  (state: AppState) => state.messageStore.threads,
  activeThreadSelector,
  pingStartingPayload,
  (
    threadMessageInfos: {[id: string]: ThreadMessageInfo},
    activeThread: ?string,
    startingPayload: () => PingStartingPayload,
  ) => {
    return () => {
      const now = Date.now();
      const threadIDsToPrune = [];
      for (let threadID in threadMessageInfos) {
        if (threadID === activeThread) {
          continue;
        }
        const threadMessageInfo = threadMessageInfos[threadID];
        if (
          threadMessageInfo.lastNavigatedTo + msInHour < now &&
          threadMessageInfo.lastPruned + msInHour * 6 < now
        ) {
          threadIDsToPrune.push(threadID);
        }
      }
      const payload = startingPayload();
      if (threadIDsToPrune.length === 0) {
        return payload;
      }
      return {
        ...payload,
        messageStorePruneRequest: {
          threadIDs: threadIDsToPrune,
        },
      };
    };
  },
);

const pingNativeActionInput = createSelector(
  activeThreadSelector,
  pingActionInput,
  pingActionInputSelector,
);

export {
  pingNativeStartingPayload,
  pingNativeActionInput,
};
