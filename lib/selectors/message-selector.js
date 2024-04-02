// @flow

import { createSelector } from 'reselect';

import { threadIsPending } from '../shared/thread-utils.js';
import {
  type ThreadMessageInfo,
  defaultNumberPerThread,
} from '../types/message-types.js';
import type { AppState } from '../types/redux-types.js';
import type { ThreadActivityStore } from '../types/thread-activity-types.js';
import type { RawThreadInfos } from '../types/thread-types.js';

const msInHour = 60 * 60 * 1000;

const nextMessagePruneTimeSelector: (state: AppState) => ?number =
  createSelector(
    (state: AppState) => state.threadStore.threadInfos,
    (state: AppState) => state.threadActivityStore,
    (state: AppState) => state.messageStore.threads,
    (
      threadInfos: RawThreadInfos,
      threadActivityStore: ThreadActivityStore,
      threadMessageInfos: { +[id: string]: ThreadMessageInfo },
    ): ?number => {
      let nextTime;
      for (const threadID in threadInfos) {
        if (
          !threadMessageInfos[threadID] ||
          threadMessageInfos[threadID].messageIDs.length <=
            defaultNumberPerThread
        ) {
          continue;
        }
        const threadPruneTime = Math.max(
          (threadActivityStore?.[threadID]?.lastNavigatedTo ?? 0) + msInHour,
          (threadActivityStore?.[threadID]?.lastPruned ?? 0) + msInHour * 6,
        );
        if (nextTime === undefined || threadPruneTime < nextTime) {
          nextTime = threadPruneTime;
        }
      }
      return nextTime;
    },
  );

const pruneThreadIDsSelector: (
  state: AppState,
) => (activeThread: ?string) => $ReadOnlyArray<string> = createSelector(
  (state: AppState): ThreadActivityStore => state.threadActivityStore,
  (state: AppState) => state.messageStore.threads,
  (
    threadActivityStore: ThreadActivityStore,
    threadMessageInfos: { +[id: string]: ThreadMessageInfo },
  ) =>
    (activeThread: ?string): $ReadOnlyArray<string> => {
      const now = Date.now();
      const threadIDsToPrune = [];
      for (const threadID in threadMessageInfos) {
        if (threadID === activeThread || threadIsPending(threadID)) {
          continue;
        }
        const threadMessageInfo = threadMessageInfos[threadID];
        if (
          (threadActivityStore?.[threadID]?.lastNavigatedTo ?? 0) + msInHour <
            now &&
          threadMessageInfo.messageIDs.length > defaultNumberPerThread
        ) {
          threadIDsToPrune.push(threadID);
        }
      }
      return threadIDsToPrune;
    },
);

export { nextMessagePruneTimeSelector, pruneThreadIDsSelector };
