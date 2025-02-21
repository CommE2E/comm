// @flow

import * as React from 'react';

import { useBaseGetMessageAuthor } from './message-author.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type {
  MessageInfo,
  RawMessageInfo,
  MessageStore,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { LastUpdatedTimes } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useGetLastUpdatedTimes(): (
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
  messages: { +[id: string]: ?MessageInfo | RawMessageInfo },
) => LastUpdatedTimes {
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const baseGetMessageAuthor = useBaseGetMessageAuthor();
  return React.useCallback(
    (threadInfo, messageStore, messages) => {
      // This callback returns three variables:
      // - lastUpdatedTime: this is a Promise that resolves with the final value
      // - lastUpdatedAtLeastTime: this is a number that represents what we
      //   should use while we're waiting for lastUpdatedTime to resolve. It's
      //   set based on the most recent message whose spec returns a non-Promise
      //   when getLastUpdatedTime is called
      // - lastUpdatedAtMostTime: this is a number that helps us when trying to
      //   pick the top N items. we initially sort by this, then resolve the
      //   lastUpdatedTime promises until we have N items that after resolving
      //   lastUpdatedTime, have higher values than any of the other items'
      //   lastUpdatedAtMostTime
      let lastUpdatedAtLeastTime = threadInfo.creationTime;

      const thread = messageStore.threads[threadInfo.id];
      if (!thread || !viewerID) {
        return {
          lastUpdatedAtLeastTime,
          lastUpdatedAtMostTime: threadInfo.creationTime,
          lastUpdatedTime: () => Promise.resolve(threadInfo.creationTime),
        };
      }

      const getLastUpdatedTimeParams = {
        threadInfo,
        viewerID,
        getMessageAuthor: (messageID: string) =>
          baseGetMessageAuthor(messageID, messageStore),
      };

      let lastUpdatedTime: ?() => Promise<?number>;
      let highestTimestamp: ?number;
      for (const messageID of thread.messageIDs) {
        const messageInfo = messages[messageID];
        if (!messageInfo) {
          continue;
        }

        // We call getLastUpdatedTime on the message spec. It can return either
        // ?number or () => Promise<?number>. If the message spec doesn't
        // implement getLastUpdatedTime, then we default to messageInfo.time.
        const { getLastUpdatedTime } = messageSpecs[messageInfo.type];
        const lastUpdatedTimeResult = getLastUpdatedTime
          ? getLastUpdatedTime(messageInfo, getLastUpdatedTimeParams)
          : messageInfo.time;

        // We only need to consider the first positive number result because
        // thread.messageIDs is ordered chronologically.
        if (
          !highestTimestamp &&
          lastUpdatedTimeResult &&
          typeof lastUpdatedTimeResult === 'number'
        ) {
          highestTimestamp = lastUpdatedTimeResult;
        }

        // We rely on the fact that thread.messageIDs is ordered chronologically
        // (newest first) to chain together lastUpdatedTime. An older message's
        // lastUpdatedTime is only considered if all of the newer messages
        // return falsey.
        const prevLastUpdatedTime = lastUpdatedTime;
        lastUpdatedTime = async () => {
          if (prevLastUpdatedTime) {
            const earlierChecks = await prevLastUpdatedTime();
            if (earlierChecks) {
              return earlierChecks;
            }
          }
          if (
            !lastUpdatedTimeResult ||
            typeof lastUpdatedTimeResult === 'number'
          ) {
            return lastUpdatedTimeResult;
          }
          return await lastUpdatedTimeResult();
        };

        if (typeof lastUpdatedTimeResult === 'number') {
          // We break from the loop the first time this condition is met.
          // There's no need to consider any older messages, since both
          // lastUpdated and lastUpdatedAtLeastTime will be this value (or
          // higher, in the case of lastUpdated). That is also why this loop
          // only sets lastUpdatedAtLeastTime once: once we get to this
          // "baseline" case, there's no need to consider any more messages.
          lastUpdatedAtLeastTime = lastUpdatedTimeResult;
          break;
        }
      }

      const lastUpdatedWithFallback = async () => {
        if (lastUpdatedTime) {
          const earlierChecks = await lastUpdatedTime();
          if (earlierChecks) {
            return earlierChecks;
          }
        }
        return lastUpdatedAtLeastTime;
      };

      const lastUpdatedAtMostTime = highestTimestamp ?? threadInfo.creationTime;

      return {
        lastUpdatedAtLeastTime,
        lastUpdatedAtMostTime,
        lastUpdatedTime: lastUpdatedWithFallback,
      };
    },
    [viewerID, baseGetMessageAuthor],
  );
}

export { useGetLastUpdatedTimes };
