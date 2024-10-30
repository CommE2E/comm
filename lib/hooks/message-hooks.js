// @flow

import * as React from 'react';

import { useGetLatestMessageEdit } from './latest-message-edit.js';
import { messageInfoSelector } from '../selectors/chat-selectors.js';
import {
  getOldestNonLocalMessageID,
  useFetchMessages,
} from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type { MessageInfo } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useSelector } from '../utils/redux-utils.js';
import sleep from '../utils/sleep.js';

function useOldestMessageServerID(threadID: string): ?string {
  return useSelector(state =>
    getOldestNonLocalMessageID(threadID, state.messageStore),
  );
}

type MessageInfoForPreview = {
  +messageInfoForPreview: ?MessageInfo,
  // If showInMessagePreview rejects all of the messages in the local store,
  // then we'll ignore it and return the most recent message (if there is one)
  // as messageInfoForPreview. In this case, we'll also set
  // shouldFetchOlderMessages to tell the caller to fetch more messages.
  +shouldFetchOlderMessages: boolean,
};

const emptyMessageInfoForPreview = {
  messageInfoForPreview: undefined,
  shouldFetchOlderMessages: false,
};

function useGetMessageInfoForPreview(): (
  threadInfo: ThreadInfo,
) => Promise<MessageInfoForPreview> {
  const messageInfos = useSelector(messageInfoSelector);
  const messageStore = useSelector(state => state.messageStore);
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const fetchMessage = useGetLatestMessageEdit();
  return React.useCallback(
    async threadInfo => {
      if (!viewerID) {
        return emptyMessageInfoForPreview;
      }
      const thread = messageStore.threads[threadInfo.id];
      if (!thread) {
        return emptyMessageInfoForPreview;
      }
      const showInMessagePreviewParams = {
        threadInfo,
        viewerID,
        fetchMessage,
      };
      for (const messageID of thread.messageIDs) {
        const messageInfo = messageInfos[messageID];
        if (!messageInfo) {
          continue;
        }
        const { showInMessagePreview } = messageSpecs[messageInfo.type];
        if (!showInMessagePreview) {
          return {
            messageInfoForPreview: messageInfo,
            shouldFetchOlderMessages: false,
          };
        }
        const shouldShow = await showInMessagePreview(
          messageInfo,
          showInMessagePreviewParams,
        );
        if (shouldShow) {
          return {
            messageInfoForPreview: messageInfo,
            shouldFetchOlderMessages: false,
          };
        }
      }
      // If we get here, that means showInMessagePreview rejected all of the
      // messages in the local store
      for (const messageID of thread.messageIDs) {
        const messageInfo = messageInfos[messageID];
        if (messageInfo) {
          return {
            messageInfoForPreview: messageInfo,
            shouldFetchOlderMessages: true,
          };
        }
      }
      return {
        messageInfoForPreview: undefined,
        shouldFetchOlderMessages: true,
      };
    },
    [messageInfos, messageStore, viewerID, fetchMessage],
  );
}

function useMessageInfoForPreview(threadInfo: ThreadInfo): ?MessageInfo {
  const [messageInfoForPreview, setMessageInfoForPreview] =
    React.useState<?MessageInfoForPreview>();

  const getMessageInfoForPreview = useGetMessageInfoForPreview();
  React.useEffect(() => {
    void (async () => {
      const newMessageInfoForPreview =
        await getMessageInfoForPreview(threadInfo);
      setMessageInfoForPreview(newMessageInfoForPreview);
    })();
  }, [threadInfo, getMessageInfoForPreview]);

  const shouldFetchOlderMessages =
    !!messageInfoForPreview?.shouldFetchOlderMessages;

  const [canFetchOlderMessages, setCanFetchOlderMessages] =
    React.useState(true);
  const fetchMessages = useFetchMessages(threadInfo);
  React.useEffect(() => {
    if (!canFetchOlderMessages || !shouldFetchOlderMessages) {
      return;
    }
    setCanFetchOlderMessages(false);
    void (async () => {
      await fetchMessages();
      await sleep(3000);
      setCanFetchOlderMessages(true);
    })();
  }, [canFetchOlderMessages, shouldFetchOlderMessages, fetchMessages]);

  return messageInfoForPreview?.messageInfoForPreview;
}

export { useOldestMessageServerID, useMessageInfoForPreview };
