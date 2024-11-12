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

        const { getLastUpdatedTime } = messageSpecs[messageInfo.type];
        const lastUpdatedTimePromisable = getLastUpdatedTime
          ? getLastUpdatedTime(messageInfo, getLastUpdatedTimeParams)
          : messageInfo.time;

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
