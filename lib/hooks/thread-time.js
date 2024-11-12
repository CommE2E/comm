// @flow

import * as React from 'react';

import { useGetLatestMessageEdit } from './latest-message-edit.js';
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
  const fetchMessage = useGetLatestMessageEdit();
  return React.useCallback(
    (threadInfo, messageStore, messages) => {
      // This callback returns two variables:
      // - lastUpdatedTime: this is a Promise that resolves with the final value
      // - lastUpdatedAtLeastTime: this is a number that represents what we
      //   should use while we're waiting for lastUpdatedTime to resolve. It's
      //   set based on the most recent message whose spec returns a non-Promise
      //   when getLastUpdatedTime is called
      let lastUpdatedAtLeastTime = threadInfo.creationTime;

      const thread = messageStore.threads[threadInfo.id];
      if (!thread || !viewerID) {
        return {
          lastUpdatedAtLeastTime,
          lastUpdatedTime: Promise.resolve(lastUpdatedAtLeastTime),
        };
      }

      const getLastUpdatedTimeParams = {
        threadInfo,
        viewerID,
        fetchMessage,
      };

      let lastUpdatedTime: ?Promise<?number>;
      for (const messageID of thread.messageIDs) {
        const messageInfo = messages[messageID];
        if (!messageInfo) {
          continue;
        }

        // We call getLastUpdatedTime on the message spec. It can return either
        // ?number or Promise<?number>. If the message spec doesn't implement
        // getLastUpdatedTime, then we default to messageInfo.time.
        const { getLastUpdatedTime } = messageSpecs[messageInfo.type];
        const lastUpdatedTimePromisable = getLastUpdatedTime
          ? getLastUpdatedTime(messageInfo, getLastUpdatedTimeParams)
          : messageInfo.time;

        // We rely on the fact that thread.messageIDs is ordered chronologically
        // (newest first) to chain together lastUpdatedTime. An older message's
        // lastUpdatedTime is only considered if all of the newer messages
        // return falsey.
        lastUpdatedTime = (async () => {
          if (lastUpdatedTime) {
            const earlierChecks = await lastUpdatedTime;
            if (earlierChecks) {
              return earlierChecks;
            }
          }
          return await lastUpdatedTimePromisable;
        })();

        if (typeof lastUpdatedTimePromisable === 'number') {
          // We break from the loop the first time this condition is met.
          // There's no need to consider any older messages, since both
          // lastUpdated and lastUpdatedAtLeastTime will be this value (or
          // higher, in the case of lastUpdated). That is also why this loop
          // only sets lastUpdatedAtLeastTime once: once we get to this
          // "baseline" case, there's no need to consider any more messages.
          lastUpdatedAtLeastTime = lastUpdatedTimePromisable;
          break;
        }
      }

      const lastUpdatedWithFallback = (async () => {
        if (lastUpdatedTime) {
          const earlierChecks = await lastUpdatedTime;
          if (earlierChecks) {
            return earlierChecks;
          }
        }
        return lastUpdatedAtLeastTime;
      })();

      return {
        lastUpdatedAtLeastTime,
        lastUpdatedTime: lastUpdatedWithFallback,
      };
    },
    [viewerID, fetchMessage],
  );
}

export { useGetLastUpdatedTimes };
