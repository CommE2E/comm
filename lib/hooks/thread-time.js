// @flow

import * as React from 'react';

import { useBaseGetMessageAuthor } from './message-author.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type { MessageStore } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import type { LastUpdatedTimes } from '../types/thread-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useGetLastUpdatedTimes(): (
  threadInfo: ThreadInfo,
  messageStore: MessageStore,
) => LastUpdatedTimes {
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const baseGetMessageAuthor = useBaseGetMessageAuthor();
  return React.useCallback(
    (threadInfo, messageStore) => {
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

      const thread = messageStore.threads[threadInfo.id];
      if (!thread || !viewerID || thread.messageIDs.length === 0) {
        return {
          lastUpdatedAtLeastTime: threadInfo.creationTime,
          lastUpdatedAtMostTime: threadInfo.creationTime,
          lastUpdatedTime: () => Promise.resolve(threadInfo.creationTime),
        };
      }

      const mostRecentMessage = messageStore.messages[thread.messageIDs[0]];
      const lastUpdatedAtMostTime =
        mostRecentMessage?.time ?? threadInfo.creationTime;

      // We default to the most recent message time.
      // - This default will only be relevant in the case that
      //   getLastUpdatedTime is implemented for every message in the loop
      //   below, and doesn't return a number for any of them. Otherwise
      //   lastUpdatedAtLeastTime will be set to the most recent message that
      //   returns a number, or whose message spec doesn't implement
      //   getLastUpdatedTime.
      // - We default to the most recent message time because the best
      //   alternative is the thread creation time, but this is likely very
      //   far in the past.
      let lastUpdatedAtLeastTime = lastUpdatedAtMostTime;

      const getLastUpdatedTimeParams = {
        threadInfo,
        viewerID,
        getMessageAuthor: (messageID: string) =>
          baseGetMessageAuthor(messageID, messageStore),
      };

      let lastUpdatedTime: ?() => Promise<?number>;
      for (const messageID of thread.messageIDs) {
        const messageInfo = messageStore.messages[messageID];
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
