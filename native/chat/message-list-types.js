// @flow

import { useNavigation, useNavigationState } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import { useThreadChatMentionCandidates } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';
import { type UserInfo } from 'lib/types/user-types.js';

import { ChatContext } from './chat-context.js';
import type { ChatRouterNavigationAction } from './chat-router.js';
import type { MarkdownRules } from '../markdown/rules.react.js';
import { useTextMessageRulesFunc } from '../markdown/rules.react.js';
import {
  MessageListRouteName,
  TextMessageTooltipModalRouteName,
} from '../navigation/route-names.js';

export type MessageListParams = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
  +searching?: boolean,
  +removeEditMode?: ?RemoveEditMode,
};

export type RemoveEditMode = (
  action: ChatRouterNavigationAction,
) => 'ignore_action' | 'reduce_action';

export type MessageListContextType = {
  +getTextMessageMarkdownRules: (useDarkStyle: boolean) => MarkdownRules,
};

const MessageListContext: React.Context<?MessageListContextType> =
  React.createContext<?MessageListContextType>();

function useMessageListContext(threadInfo: ThreadInfo) {
  const chatMentionCandidates = useThreadChatMentionCandidates(threadInfo);
  const getTextMessageMarkdownRules = useTextMessageRulesFunc(
    threadInfo,
    chatMentionCandidates,
  );
  return React.useMemo(
    () => ({
      getTextMessageMarkdownRules,
    }),
    [getTextMessageMarkdownRules],
  );
}

type Props = {
  +children: React.Node,
  +threadInfo: ThreadInfo,
};
function MessageListContextProvider(props: Props): React.Node {
  const context = useMessageListContext(props.threadInfo);
  return (
    <MessageListContext.Provider value={context}>
      {props.children}
    </MessageListContext.Provider>
  );
}

type NavigateToThreadAction = {
  +name: typeof MessageListRouteName,
  +params: MessageListParams,
  +key: string,
};
function createNavigateToThreadAction(
  params: MessageListParams,
): NavigateToThreadAction {
  return {
    name: MessageListRouteName,
    params,
    key: `${MessageListRouteName}${params.threadInfo.id}`,
  };
}

function useNavigateToThread(): (params: MessageListParams) => void {
  const { navigate } = useNavigation();
  return React.useCallback(
    (params: MessageListParams) => {
      navigate<'MessageList'>(createNavigateToThreadAction(params));
    },
    [navigate],
  );
}

function useTextMessageMarkdownRules(useDarkStyle: boolean): MarkdownRules {
  const messageListContext = React.useContext(MessageListContext);
  invariant(messageListContext, 'DummyTextNode should have MessageListContext');
  return messageListContext.getTextMessageMarkdownRules(useDarkStyle);
}

function useNavigateToThreadWithFadeAnimation(
  threadInfo: ThreadInfo,
  messageKey: ?string,
): () => mixed {
  const chatContext = React.useContext(ChatContext);
  invariant(chatContext, 'ChatContext should be set');
  const setSidebarSourceID = chatContext?.setCurrentTransitionSidebarSourceID;
  const setSidebarAnimationType = chatContext?.setSidebarAnimationType;
  const navigateToThread = useNavigateToThread();
  const navigationStack = useNavigationState(state => state.routes);

  return React.useCallback(() => {
    if (
      navigationStack[navigationStack.length - 1].name ===
      TextMessageTooltipModalRouteName
    ) {
      setSidebarSourceID && setSidebarSourceID(messageKey);
      setSidebarAnimationType && setSidebarAnimationType('fade_source_message');
    }
    navigateToThread({ threadInfo });
  }, [
    messageKey,
    navigateToThread,
    navigationStack,
    setSidebarAnimationType,
    setSidebarSourceID,
    threadInfo,
  ]);
}

export {
  MessageListContextProvider,
  createNavigateToThreadAction,
  useNavigateToThread,
  useTextMessageMarkdownRules,
  useNavigateToThreadWithFadeAnimation,
};
