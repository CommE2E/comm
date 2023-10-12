// @flow

import { createSelector } from 'reselect';

import { threadIsPending } from 'lib/shared/thread-utils.js';
import type { ThreadMessageInfo } from 'lib/types/message-types.js';
import { defaultNumberPerThread } from 'lib/types/message-types.js';
import type { ThreadActivityStore } from 'lib/types/thread-activity-types.js';
import { type RawThreadInfo } from 'lib/types/thread-types.js';

import { activeThreadSelector } from '../navigation/nav-selectors.js';
import type { AppState } from '../redux/state-types.js';
import type { NavPlusRedux } from '../types/selector-types.js';

const msInHour = 60 * 60 * 1000;

const nextMessagePruneTimeSelector: (state: AppState) => ?number =
  createSelector(
    (state: AppState) => state.threadStore.threadInfos,
    (state: AppState) => state.threadActivityStore,
    (
      threadInfos: { +[id: string]: RawThreadInfo },
      threadActivityStore: ThreadActivityStore,
    ): ?number => {
      let nextTime;
      for (const threadID in threadInfos) {
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
  input: NavPlusRedux,
) => () => $ReadOnlyArray<string> = createSelector(
  (input: NavPlusRedux): ThreadActivityStore => input.redux.threadActivityStore,
  (input: NavPlusRedux) => input.redux.messageStore.threads,
  (input: NavPlusRedux) => activeThreadSelector(input.navContext),
  (
      threadActivityStore: ThreadActivityStore,
      threadMessageInfos: { +[id: string]: ThreadMessageInfo },
      activeThread: ?string,
    ) =>
    (): $ReadOnlyArray<string> => {
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
