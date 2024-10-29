// @flow

import * as React from 'react';

import { useGetLatestMessageEdit } from './latest-message-edit.js';
import { messageInfoSelector } from '../selectors/chat-selectors.js';
import { getOldestNonLocalMessageID } from '../shared/message-utils.js';
import { messageSpecs } from '../shared/messages/message-specs.js';
import type { MessageInfo } from '../types/message-types.js';
import type { ThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { useSelector } from '../utils/redux-utils.js';

function useOldestMessageServerID(threadID: string): ?string {
  return useSelector(state =>
    getOldestNonLocalMessageID(threadID, state.messageStore),
  );
}

function useGetMessageInfoForPreview(): (
  threadInfo: ThreadInfo,
) => Promise<?MessageInfo> {
  const messageInfos = useSelector(messageInfoSelector);
  const messageStore = useSelector(state => state.messageStore);
  const viewerID = useSelector(state => state.currentUserInfo?.id);
  const fetchMessage = useGetLatestMessageEdit();
  return React.useCallback(
    async threadInfo => {
      if (!viewerID) {
        return null;
      }
      const thread = messageStore.threads[threadInfo.id];
      if (!thread) {
        return null;
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
          return messageInfo;
        }
        const shouldShow = await showInMessagePreview(
          messageInfo,
          showInMessagePreviewParams,
        );
        if (shouldShow) {
          return messageInfo;
        }
      }
      return null;
    },
    [messageInfos, messageStore, viewerID, fetchMessage],
  );
}

function useMessageInfoForPreview(threadInfo: ThreadInfo): ?MessageInfo {
  const [messageInfo, setMessageInfo] = React.useState<?MessageInfo>();

  const getMessageInfoForPreview = useGetMessageInfoForPreview();
  React.useEffect(() => {
    void (async () => {
      const newMessageInfoForPreview =
        await getMessageInfoForPreview(threadInfo);
      setMessageInfo(newMessageInfoForPreview);
    })();
  }, [threadInfo, getMessageInfoForPreview]);

  return messageInfo;
}

export { useOldestMessageServerID, useMessageInfoForPreview };
