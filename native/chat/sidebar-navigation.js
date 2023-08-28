// @flow

import invariant from 'invariant';
import * as React from 'react';

import { ENSCacheContext } from 'lib/components/ens-cache-provider.react.js';
import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import {
  createPendingSidebar,
  createUnresolvedPendingSidebar,
  useThreadChatMentionCandidates,
} from 'lib/shared/thread-utils.js';
import type {
  ThreadInfo,
  ChatMentionCandidates,
} from 'lib/types/thread-types.js';
import type { LoggedInUserInfo } from 'lib/types/user-types.js';
import type { GetENSNames } from 'lib/utils/ens-helpers.js';

import { ChatContext } from './chat-context.js';
import { useNavigateToThread } from './message-list-types.js';
import { getDefaultTextMessageRules } from '../markdown/rules.react.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type GetUnresolvedSidebarThreadInfoInput = {
  +sourceMessage: ChatMessageInfoItemWithHeight,
  +loggedInUserInfo: ?LoggedInUserInfo,
  +chatMentionCandidates: ChatMentionCandidates,
};
function getUnresolvedSidebarThreadInfo(
  input: GetUnresolvedSidebarThreadInfoInput,
): ?ThreadInfo {
  const { sourceMessage, loggedInUserInfo, chatMentionCandidates } = input;
  const threadCreatedFromMessage = sourceMessage.threadCreatedFromMessage;
  if (threadCreatedFromMessage) {
    return threadCreatedFromMessage;
  }

  if (!loggedInUserInfo) {
    return null;
  }

  const { messageInfo, threadInfo } = sourceMessage;
  return createUnresolvedPendingSidebar({
    sourceMessageInfo: messageInfo,
    parentThreadInfo: threadInfo,
    loggedInUserInfo,
    markdownRules: getDefaultTextMessageRules(chatMentionCandidates)
      .simpleMarkdownRules,
  });
}

type GetSidebarThreadInfoInput = {
  ...GetUnresolvedSidebarThreadInfoInput,
  +getENSNames: ?GetENSNames,
};
async function getSidebarThreadInfo(
  input: GetSidebarThreadInfoInput,
): Promise<?ThreadInfo> {
  const {
    sourceMessage,
    loggedInUserInfo,
    getENSNames,
    chatMentionCandidates,
  } = input;
  const threadCreatedFromMessage = sourceMessage.threadCreatedFromMessage;
  if (threadCreatedFromMessage) {
    return threadCreatedFromMessage;
  }

  if (!loggedInUserInfo) {
    return null;
  }

  const { messageInfo, threadInfo } = sourceMessage;
  return await createPendingSidebar({
    sourceMessageInfo: messageInfo,
    parentThreadInfo: threadInfo,
    loggedInUserInfo,
    markdownRules: getDefaultTextMessageRules(chatMentionCandidates)
      .simpleMarkdownRules,
    getENSNames,
  });
}

function useNavigateToSidebar(
  item: ChatMessageInfoItemWithHeight,
): () => mixed {
  const loggedInUserInfo = useLoggedInUserInfo();
  const navigateToThread = useNavigateToThread();
  const cacheContext = React.useContext(ENSCacheContext);
  const chatMentionCandidates = useThreadChatMentionCandidates(item.threadInfo);
  const { getENSNames } = cacheContext;
  return React.useCallback(async () => {
    const threadInfo = await getSidebarThreadInfo({
      sourceMessage: item,
      loggedInUserInfo,
      getENSNames,
      chatMentionCandidates,
    });
    invariant(threadInfo, 'threadInfo should be set');
    navigateToThread({ threadInfo });
  }, [
    item,
    loggedInUserInfo,
    getENSNames,
    chatMentionCandidates,
    navigateToThread,
  ]);
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
