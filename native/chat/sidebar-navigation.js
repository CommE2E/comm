// @flow

import invariant from 'invariant';
import * as React from 'react';

import { createPendingSidebar } from 'lib/shared/thread-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import { getDefaultTextMessageRules } from '../markdown/rules.react';
import { useSelector } from '../redux/redux-utils';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types';
import { ChatContext } from './chat-context';
import { useNavigateToThread } from './message-list-types';

function getSidebarThreadInfo(
  sourceMessage: ChatMessageInfoItemWithHeight,
  viewerID?: ?string,
): ?ThreadInfo {
  const threadCreatedFromMessage = sourceMessage.threadCreatedFromMessage;
  if (threadCreatedFromMessage) {
    return threadCreatedFromMessage;
  }

  if (!viewerID) {
    return null;
  }

  const { messageInfo, threadInfo } = sourceMessage;
  return createPendingSidebar({
    sourceMessageInfo: messageInfo,
    parentThreadInfo: threadInfo,
    viewerID,
    markdownRules: getDefaultTextMessageRules().simpleMarkdownRules,
  });
}

function useNavigateToSidebar(item: ChatMessageInfoItemWithHeight): () => void {
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const threadInfo = React.useMemo(() => getSidebarThreadInfo(item, viewerID), [
    item,
    viewerID,
  ]);
  const navigateToThread = useNavigateToThread();
  return React.useCallback(() => {
    invariant(threadInfo, 'threadInfo should be set');
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);
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
  getSidebarThreadInfo,
  useNavigateToSidebar,
  useAnimatedNavigateToSidebar,
};
