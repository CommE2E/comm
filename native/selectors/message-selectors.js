// @flow

import type { AppState } from '../redux/redux-setup';
import type { ThreadMessageInfo } from 'lib/types/message-types';

import { createSelector } from 'reselect';

import { activeThreadSelector } from './nav-selectors';

const msInHour = 60 * 60 * 1000;

const nextMessagePruneTimeSelector: (
  state: AppState,
) => ?number = createSelector(
  (state: AppState) => state.messageStore.threads,
  (threadMessageInfos: {[id: string]: ThreadMessageInfo}): ?number => {
    const now = Date.now();
    let nextTime;
    for (let threadID in threadMessageInfos) {
      const threadMessageInfo = threadMessageInfos[threadID];
      const threadPruneTime = Math.max(
        threadMessageInfo.lastNavigatedTo + msInHour,
        threadMessageInfo.lastPruned + msInHour * 6,
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
) => () => $ReadOnlyArray<string> = createSelector(
  (state: AppState) => state.messageStore.threads,
  activeThreadSelector,
  (
    threadMessageInfos: {[id: string]: ThreadMessageInfo},
    activeThread: ?string,
  ) => (): $ReadOnlyArray<string> => {
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
    return threadIDsToPrune;
  },
);

export {
  nextMessagePruneTimeSelector,
  pruneThreadIDsSelector,
};
