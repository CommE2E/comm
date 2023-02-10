// @flow

import invariant from 'invariant';
import * as React from 'react';

import { ENSCacheContext } from 'lib/components/ens-cache-provider.react.js';
import {
  createPendingSidebar,
  createUnresolvedPendingSidebar,
} from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { GetENSNames } from 'lib/utils/ens-helpers.js';

import { getDefaultTextMessageRules } from '../markdown/rules.react.js';
import { useSelector } from '../redux/redux-utils.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';
import { ChatContext } from './chat-context.js';
import { useNavigateToThread } from './message-list-types.js';

type GetUnresolvedSidebarThreadInfoInput = {
  +sourceMessage: ChatMessageInfoItemWithHeight,
  +viewerID?: ?string,
};
function getUnresolvedSidebarThreadInfo(
  input: GetUnresolvedSidebarThreadInfoInput,
): ?ThreadInfo {
  const { sourceMessage, viewerID } = input;
  const threadCreatedFromMessage = sourceMessage.threadCreatedFromMessage;
  if (threadCreatedFromMessage) {
    return threadCreatedFromMessage;
  }

  if (!viewerID) {
    return null;
  }

  const { messageInfo, threadInfo } = sourceMessage;
  return createUnresolvedPendingSidebar({
    sourceMessageInfo: messageInfo,
    parentThreadInfo: threadInfo,
    viewerID,
    markdownRules: getDefaultTextMessageRules().simpleMarkdownRules,
  });
}

type GetSidebarThreadInfoInput = {
  ...GetUnresolvedSidebarThreadInfoInput,
  +getENSNames: ?GetENSNames,
};
async function getSidebarThreadInfo(
  input: GetSidebarThreadInfoInput,
): Promise<?ThreadInfo> {
  const { sourceMessage, viewerID, getENSNames } = input;
  const threadCreatedFromMessage = sourceMessage.threadCreatedFromMessage;
  if (threadCreatedFromMessage) {
    return threadCreatedFromMessage;
  }

  if (!viewerID) {
    return null;
  }

  const { messageInfo, threadInfo } = sourceMessage;
  return await createPendingSidebar({
    sourceMessageInfo: messageInfo,
    parentThreadInfo: threadInfo,
    viewerID,
    markdownRules: getDefaultTextMessageRules().simpleMarkdownRules,
    getENSNames,
  });
}

function useNavigateToSidebar(
  item: ChatMessageInfoItemWithHeight,
): () => mixed {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const navigateToThread = useNavigateToThread();
  const cacheContext = React.useContext(ENSCacheContext);
  const { getENSNames } = cacheContext;
  return React.useCallback(async () => {
    const threadInfo = await getSidebarThreadInfo({
      sourceMessage: item,
      viewerID,
      getENSNames,
    });
    invariant(threadInfo, 'threadInfo should be set');
    navigateToThread({ threadInfo });
  }, [navigateToThread, item, viewerID, getENSNames]);
}

function useAnimatedNavigateToSidebar(
  item: ChatMessageInfoItemWithHeight,
): () => void {
  const chatContext = React.useContext(ChatContext);
  const setSidebarSourceID = chatContext?.setCurrentTransitionSidebarSourceID;
  const navigateToSidebar = useNavigateToSidebar(item);
  const messageID = item.messageInfo.id;
  return React.useCallback(() => {
    setSidebarSourceID && setSidebarSourceID(messageID);
    navigateToSidebar();
  }, [setSidebarSourceID, messageID, navigateToSidebar]);
}

export {
  getUnresolvedSidebarThreadInfo,
  useNavigateToSidebar,
  useAnimatedNavigateToSidebar,
};
