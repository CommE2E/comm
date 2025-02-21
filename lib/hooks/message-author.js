// @flow

import * as React from 'react';

import { useBaseGetLatestMessageEdit } from './latest-message-edit.js';
import type { MessageStore } from '../types/message-types.js';
import { messageIDIsThick } from '../types/message-types.js';
import { useSelector } from '../utils/redux-utils.js';

const messageAuthorCache = new Map<string, string>();

function useGetMessageAuthor(): (
  messageID: string,
) => ?string | Promise<?string> {
  const messageStore = useSelector(state => state.messageStore);
  const baseGetMessageAuthor = useBaseGetMessageAuthor();
  return React.useCallback(
    (messageID: string) => baseGetMessageAuthor(messageID, messageStore),
    [baseGetMessageAuthor, messageStore],
  );
}

function useBaseGetMessageAuthor(): (
  messageID: string,
  messageStore: MessageStore,
) => ?string | Promise<?string> {
  const baseGetLatestMessageEdit = useBaseGetLatestMessageEdit();
  return React.useCallback(
    (messageID: string, messageStore: MessageStore) => {
      const messageFromRedux = messageStore.messages[messageID];
      if (messageFromRedux) {
        return messageFromRedux.creatorID;
      }
      if (!messageIDIsThick(messageID)) {
        // For thin threads, everything in SQLite should also be in Redux, so
        // there is no point trying to query SQLite if it's not in Redux
        return null;
      }
      const messageAuthorFromCache = messageAuthorCache.get(messageID);
      if (messageAuthorFromCache) {
        return messageAuthorFromCache;
      }
      return (async () => {
        const rawMessageInfo = await baseGetLatestMessageEdit(
          messageID,
          messageStore,
        );
        const creatorID = rawMessageInfo?.creatorID;
        if (creatorID) {
          messageAuthorCache.set(messageID, creatorID);
        }
        return creatorID;
      })();
    },
    [baseGetLatestMessageEdit],
  );
}

export { useGetMessageAuthor, useBaseGetMessageAuthor };
