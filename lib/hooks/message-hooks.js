// @flow

import * as React from 'react';

import { useGetMessageAuthor } from './message-author.js';
import { messageInfoSelector } from '../selectors/chat-selectors.js';
import {
  getOldestNonLocalMessageID,
  useFetchMessages,
} from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import {
  type MessageInfo,
  defaultNumberPerThread,
} from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadIDIsThick } from '../types/thread-types.js';
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
  // shouldFetchOlderMessages to tell the caller how many more messages to
  // fetch.
  +shouldFetchOlderMessages: number,
};

const emptyMessageInfoForPreview = {
  messageInfoForPreview: undefined,
  shouldFetchOlderMessages: 0,
};

function useGetMessageInfoForPreview(): (
  threadInfo: ThreadInfo,
) => Promise<MessageInfoForPreview> {
  const messageInfos = useSelector(messageInfoSelector);
  const messageStore = useSelector(state => state.messageStore);
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const getMessageAuthor = useGetMessageAuthor();
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
        getMessageAuthor,
      };
      let mostRecentMessageInfo;
      for (const messageID of thread.messageIDs) {
        const messageInfo = messageInfos[messageID];
        if (!messageInfo) {
          continue;
        }
        if (!mostRecentMessageInfo) {
          mostRecentMessageInfo = messageInfo;
        }
        const { showInMessagePreview } = messageSpecs[messageInfo.type];
        if (!showInMessagePreview) {
          return {
            messageInfoForPreview: messageInfo,
            shouldFetchOlderMessages: 0,
          };
        }
        let shouldShow = showInMessagePreview(
          messageInfo,
          showInMessagePreviewParams,
        );
        if (shouldShow instanceof Promise) {
          shouldShow = await shouldShow;
        }
        if (shouldShow) {
          return {
            messageInfoForPreview: messageInfo,
            shouldFetchOlderMessages: 0,
          };
        }
      }
      let numMessagesToFetch = defaultNumberPerThread;
      if (!threadIDIsThick(threadInfo.id)) {
        numMessagesToFetch = Math.max(
          defaultNumberPerThread - thread.messageIDs.length,
          0,
        );
      }
      // If we get here, that means showInMessagePreview rejected all of the
      // messages in the local store
      return {
        messageInfoForPreview: mostRecentMessageInfo,
        shouldFetchOlderMessages: numMessagesToFetch,
      };
    },
    [messageInfos, messageStore, viewerID, getMessageAuthor],
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
    messageInfoForPreview?.shouldFetchOlderMessages ?? 0;

  const [canFetchOlderMessages, setCanFetchOlderMessages] =
    React.useState(true);
  const fetchMessages = useFetchMessages(threadInfo);
  React.useEffect(() => {
    if (!canFetchOlderMessages || shouldFetchOlderMessages === 0) {
      return;
    }
    setCanFetchOlderMessages(false);
    void (async () => {
      await fetchMessages({ numMessagesToFetch: shouldFetchOlderMessages });
      await sleep(3000);
      setCanFetchOlderMessages(true);
    })();
  }, [canFetchOlderMessages, shouldFetchOlderMessages, fetchMessages]);

  return messageInfoForPreview?.messageInfoForPreview;
}

export { useOldestMessageServerID, useMessageInfoForPreview };
